-- Cancelar tem que fechar a porta.
--
-- Na confirmação, `process_payment_event` agenda `access.revoke:<reserva>` para
-- o fim da reunião. `cancel_booking` inseria a MESMA `dedupe_key` com
-- `do nothing`, então o cancelamento não antecipava nada: a revogação continuava
-- marcada para o horário original. O cliente cancelava, recebia o reembolso, e o
-- código dele abria até o fim da reserva que não existia mais, numa sala que a
-- grade já tinha revendido.
--
-- A dedupe_key estava fazendo dois trabalhos: identificar o job e definir
-- quando ele roda. São coisas diferentes.

begin;

-- A regra passa a morar junto do dado, e não repetida em cada caminho que
-- encerra uma reserva. O reembolso vindo do provedor nunca revogou nada, e
-- ganha o comportamento de graça.
create or replace function public.schedule_access_revoke()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status not in ('cancelled','refunded') or old.status = new.status then
    return new;
  end if;
  insert into public.durable_jobs(company_id,kind,payload,dedupe_key,available_at)
  select new.company_id,'access.revoke',jsonb_build_object('bookingId',new.id),
         'access.revoke:'||new.id, now()
  where exists(
    select 1 from public.booking_access_codes
    where booking_id=new.id and company_id=new.company_id and status='active'
  )
  -- `least` porque antecipar é sempre seguro e adiar nunca é: se a revogação já
  -- estava marcada para daqui a dois dias, ela passa a valer agora.
  on conflict (dedupe_key) do update
    set available_at=least(durable_jobs.available_at, excluded.available_at),
        updated_at=now()
    where durable_jobs.status='pending';
  return new;
end;
$$;

create trigger bookings_schedule_access_revoke
  after update of status on public.bookings
  for each row execute function public.schedule_access_revoke();

-- `cancel_booking` perde o próprio enfileiramento de revogação: agora é do
-- gatilho, e manter os dois seria a mesma decisão escrita em dois lugares.
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
    select selected_booking.company_id,'refund.request',jsonb_build_object('bookingId',selected_booking.id),'refund.request:'||selected_booking.id
    where exists(select 1 from public.payments where booking_id=selected_booking.id and company_id=selected_booking.company_id and status='approved')
    on conflict (dedupe_key) do nothing;
  return selected_booking;
end;
$$;

commit;
