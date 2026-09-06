-- Cliente da plataforma, e não de um coworking.
--
-- Até aqui, quem reservava precisava ser membro da empresa dona da sala:
-- `profiles.company_id` é obrigatório, `unique(auth_user_id)` limita a pessoa a
-- um único perfil, e `create_booking_hold` recusava com `tenant_access_denied`
-- quem não fosse membro. Isso torna o cadastro por convite inevitável — alguém
-- precisa dizer a que empresa a pessoa pertence — e impede a mesma pessoa de
-- alugar em dois coworkings.
--
-- `customers` separa as duas identidades: `profiles` continua sendo a equipe do
-- coworking, e `customers` é quem aluga, sem empresa nenhuma.

begin;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quem já reservava vira cliente da plataforma, mantendo o mesmo login. O
-- perfil antigo continua onde está: apagá-lo quebraria os vínculos de equipe de
-- quem também trabalha no coworking.
insert into public.customers (auth_user_id, name, email, phone, status)
select distinct on (p.auth_user_id)
  p.auth_user_id, p.name, lower(p.email), p.phone, p.status
from public.profiles p
where p.auth_user_id is not null
order by p.auth_user_id, p.created_at
-- Sem alvo: cobre tanto `auth_user_id` quanto `email` repetido entre empresas.
on conflict do nothing;

/* ------------------------------------------------- reservas e notificações */

-- As chaves estrangeiras foram declaradas sem nome, então o nome é o gerado
-- pelo Postgres. Descobrir em vez de adivinhar evita uma migração que falha só
-- no banco de produção.
do $$
declare old_fk record;
begin
  for old_fk in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where conrelid in ('public.bookings'::regclass, 'public.notifications'::regclass)
      and contype = 'f'
      and confrelid = 'public.profiles'::regclass
  loop
    execute format('alter table %s drop constraint %I', old_fk.table_name, old_fk.conname);
  end loop;
end $$;

update public.bookings b
set user_id = c.id
from public.profiles p
join public.customers c on c.auth_user_id = p.auth_user_id
where b.user_id = p.id;

update public.notifications n
set user_id = c.id
from public.profiles p
join public.customers c on c.auth_user_id = p.auth_user_id
where n.user_id = p.id;

-- Uma reserva órfã aqui significaria perfil sem login: melhor a migração parar
-- do que deixar a tabela com uma referência que não aponta para lugar nenhum.
do $$
declare orphans integer;
begin
  select count(*) into orphans from public.bookings b
    where not exists (select 1 from public.customers c where c.id = b.user_id);
  if orphans > 0 then
    raise exception 'bookings_sem_cliente: %', orphans;
  end if;
end $$;

alter table public.bookings
  add constraint bookings_user_id_fkey
  foreign key (user_id) references public.customers(id) on delete restrict;

alter table public.notifications
  add constraint notifications_user_id_fkey
  foreign key (user_id) references public.customers(id) on delete cascade;

/* ------------------------------------------------------------------- RLS */

alter table public.customers enable row level security;

-- Consultar `bookings` direto na política de `customers` cria recursão: a
-- política de `bookings` consulta `customers` de volta, e o Postgres recusa com
-- `infinite recursion detected in policy`. A função roda como `security
-- definer`, então lê `bookings` sem reaplicar a RLS e o ciclo se fecha.
create or replace function public.customer_booked_in_managed_company(target_customer_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
    where b.user_id = target_customer_id
      and public.can_manage_company(b.company_id)
  );
$$;

revoke all on function public.customer_booked_in_managed_company(uuid) from public;
grant execute on function public.customer_booked_in_managed_company(uuid) to authenticated;

-- O gestor enxerga quem reservou na empresa dele, e só. Cliente de outro
-- coworking não aparece.
create policy customers_self_or_manager on public.customers for select using (
  auth_user_id = auth.uid()
  or public.customer_booked_in_managed_company(id)
);

create policy customers_self_update on public.customers for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Sem política de insert: a criação passa por `ensure_customer`, que amarra a
-- linha ao `auth.uid()` de quem chama.

drop policy if exists bookings_owner_or_manager on public.bookings;
create policy bookings_owner_or_manager on public.bookings for select using (
  public.can_manage_company(company_id)
  or exists (
    select 1 from public.customers c
    where c.id = bookings.user_id and c.auth_user_id = auth.uid()
  )
);

drop policy if exists payments_owner_or_manager on public.payments;
create policy payments_owner_or_manager on public.payments for select using (
  public.can_manage_company(company_id)
  or exists (
    select 1 from public.bookings b
    join public.customers c on c.id = b.user_id
    where b.id = payments.booking_id
      and b.company_id = payments.company_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists access_owner_or_manager on public.booking_access_codes;
create policy access_owner_or_manager on public.booking_access_codes for select using (
  public.can_manage_company(company_id)
  or exists (
    select 1 from public.bookings b
    join public.customers c on c.id = b.user_id
    where b.id = booking_access_codes.booking_id
      and b.company_id = booking_access_codes.company_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists notifications_owner_or_manager on public.notifications;
create policy notifications_owner_or_manager on public.notifications for select using (
  public.can_manage_company(company_id)
  or exists (
    select 1 from public.customers c
    where c.id = notifications.user_id and c.auth_user_id = auth.uid()
  )
);

/* -------------------------------------------------------------- funções */

-- Cadastro sem convite: a linha nasce amarrada ao `auth.uid()` de quem chama,
-- com o e-mail vindo do token, não do formulário.
create or replace function public.ensure_customer(target_name text default null)
returns public.customers
language plpgsql security definer set search_path = public as $$
declare
  result public.customers;
  current_email text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if current_email = '' then raise exception 'authentication_required'; end if;

  insert into public.customers (auth_user_id, name, email)
  values (
    auth.uid(),
    coalesce(nullif(trim(target_name), ''), split_part(current_email, '@', 1)),
    current_email
  )
  on conflict (auth_user_id) do update
    set name = coalesce(nullif(trim(target_name), ''), customers.name),
        email = excluded.email,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.ensure_customer(text) from public;
grant execute on function public.ensure_customer(text) to authenticated;

-- Reservar deixa de exigir ser membro da empresa. O que passa a valer é: a
-- reserva é sua, ou você gere o coworking e está reservando para alguém.
create or replace function public.create_booking_hold(
  target_company_id uuid,
  target_location_id uuid,
  target_room_id uuid,
  target_user_id uuid,
  target_start_at timestamptz,
  target_end_at timestamptz,
  target_idempotency_key text
) returns public.bookings
language plpgsql security definer set search_path=public as $$
declare
  result public.bookings;
  selected_room public.rooms;
  duration_minutes numeric;
  computed_subtotal integer;
begin
  if target_start_at<=now() then raise exception 'booking_must_be_in_future'; end if;
  if not exists(
    select 1 from public.customers c
    where c.id=target_user_id
      and c.status='active'
      and (c.auth_user_id=auth.uid() or public.can_manage_company(target_company_id))
  ) then raise exception 'customer_access_denied'; end if;
  select * into selected_room from public.rooms
    where id=target_room_id and company_id=target_company_id and location_id=target_location_id and status='active';
  if not found then raise exception 'room_not_found'; end if;
  duration_minutes := extract(epoch from (target_end_at-target_start_at))/60;
  if duration_minutes < selected_room.minimum_booking_minutes
     or duration_minutes > selected_room.maximum_booking_minutes
     or target_end_at <= target_start_at
  then raise exception 'invalid_booking_duration'; end if;
  computed_subtotal := round((duration_minutes/60)*selected_room.hourly_price_cents);
  update public.bookings set status='expired', updated_at=now()
    where company_id=target_company_id and room_id=target_room_id and status='awaiting_payment' and hold_expires_at<=now();
  insert into public.bookings(company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,discount_cents,total_cents,status,hold_expires_at,idempotency_key)
    values(target_company_id,target_location_id,target_room_id,target_user_id,target_start_at,target_end_at,computed_subtotal,0,computed_subtotal,'awaiting_payment',now()+interval '10 minutes',target_idempotency_key)
    returning * into result;
  insert into public.durable_jobs(company_id,kind,payload,dedupe_key,available_at)
    values(result.company_id,'booking.expire',jsonb_build_object('bookingId',result.id),'booking.expire:'||result.id,result.hold_expires_at)
    on conflict (dedupe_key) do nothing;
  insert into public.audit_logs(company_id,actor_user_id,request_id,entity_type,entity_id,action,new_values)
    values(result.company_id,auth.uid(),target_idempotency_key,'booking',result.id,'BOOKING_HOLD_CREATED',jsonb_build_object('startAt',result.start_at,'endAt',result.end_at,'totalCents',result.total_cents));
  return result;
end;
$$;

create or replace function public.cancel_booking(target_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path=public as $$
declare selected_booking public.bookings;
begin
  select * into selected_booking from public.bookings where id=target_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if not exists(
    select 1 from public.customers c
    where c.id=selected_booking.user_id
      and (c.auth_user_id=auth.uid() or public.can_manage_company(selected_booking.company_id))
  ) then raise exception 'booking_access_denied'; end if;
  if selected_booking.status not in ('awaiting_payment','confirmed') or selected_booking.start_at<=now()
    then raise exception 'booking_cannot_be_cancelled'; end if;
  update public.bookings set status='cancelled',cancelled_at=now(),updated_at=now()
    where id=selected_booking.id returning * into selected_booking;
  insert into public.audit_logs(company_id,actor_user_id,request_id,entity_type,entity_id,action,new_values)
    values(selected_booking.company_id,auth.uid(),'cancel:'||selected_booking.id,'booking',selected_booking.id,'BOOKING_CANCELLED',jsonb_build_object('cancelledAt',selected_booking.cancelled_at));
  insert into public.durable_jobs(company_id,kind,payload,dedupe_key)
    select selected_booking.company_id,'access.revoke',jsonb_build_object('bookingId',selected_booking.id),'access.revoke:'||selected_booking.id
    where exists(select 1 from public.booking_access_codes where booking_id=selected_booking.id and company_id=selected_booking.company_id and status='active')
    on conflict (dedupe_key) do nothing;
  insert into public.durable_jobs(company_id,kind,payload,dedupe_key)
    select selected_booking.company_id,'refund.request',jsonb_build_object('bookingId',selected_booking.id),'refund.request:'||selected_booking.id
    where exists(select 1 from public.payments where booking_id=selected_booking.id and company_id=selected_booking.company_id and status='approved')
    on conflict (dedupe_key) do nothing;
  return selected_booking;
end;
$$;

commit;
