-- Quando avisar a limpeza.
--
-- O aviso saía sempre no fim da reunião, e nem por escolha: o job só era
-- enfileirado por `booking.complete`, que exige `end_at <= now()`. Avisar antes
-- era impossível por construção, não por configuração.
--
-- Agora o job nasce na confirmação da reserva, com hora marcada — o mesmo
-- padrão que `access.revoke` já usava.

begin;

alter table public.rooms
  add column cleaning_notice_offset_minutes integer not null default 0;

-- Negativo avisa antes de a reunião acabar, zero no fim, positivo depois. Um
-- único inteiro com sinal em vez de número + direção: dois campos permitiriam
-- gravar "-30 minutos depois", que não quer dizer nada.
alter table public.rooms
  add constraint rooms_cleaning_notice_range
  check (cleaning_notice_offset_minutes between -240 and 240);

comment on column public.rooms.cleaning_notice_offset_minutes is
  'Minutos em relação ao fim da reserva: negativo avisa antes, 0 no fim, positivo depois.';

alter table public.companies
  add column cleaning_contact_phone text;

alter table public.companies
  add constraint companies_cleaning_phone_format
  check (cleaning_contact_phone is null or cleaning_contact_phone ~ '^\+?[0-9][0-9 ()-]{7,19}$');

/* ------------------------------------------------------------- agendamento */

create or replace function public.enqueue_cleaning_notice()
returns trigger language plpgsql security definer set search_path = public as $$
declare offset_minutes integer;
begin
  -- Só na virada para `confirmed`: sem isso, cada `updated_at` da reserva
  -- tentaria enfileirar de novo.
  if new.status <> 'confirmed' or old.status = 'confirmed' then return new; end if;
  select cleaning_notice_offset_minutes into offset_minutes
    from public.rooms where id = new.room_id and company_id = new.company_id;
  insert into public.durable_jobs(company_id, kind, payload, dedupe_key, available_at)
  values (
    new.company_id,
    'cleaning.request',
    jsonb_build_object('bookingId', new.id),
    'cleaning.request:' || new.id,
    new.end_at + (coalesce(offset_minutes, 0) || ' minutes')::interval
  )
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

create trigger bookings_enqueue_cleaning_notice
  after update of status on public.bookings
  for each row execute function public.enqueue_cleaning_notice();

commit;
