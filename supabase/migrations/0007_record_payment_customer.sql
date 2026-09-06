-- Registrar o pagamento ficou para trás na virada para marketplace.
--
-- A 0004 trocou `profiles` por `customers` em `create_booking_hold` e em
-- `cancel_booking`, mas `record_pending_payment` continuou exigindo um perfil
-- para o dono da reserva — e cliente da plataforma não tem perfil.
--
-- O efeito era o pior possível: o hold nascia, o cartão era cobrado no Mercado
-- Pago, e o registro do pagamento morria em `booking_access_denied`. Sem linha
-- em `payments`, a notificação do provedor caía em `payment_not_found` e a
-- reserva nunca saía de `awaiting_payment`. Cobrado e sem reserva.

begin;

create or replace function public.record_pending_payment(
  target_booking_id uuid,
  target_provider_payment_id text,
  target_payment_method text,
  target_idempotency_key text
) returns public.payments
language plpgsql security definer set search_path=public as $$
declare
  selected_booking public.bookings;
  result public.payments;
begin
  select * into selected_booking from public.bookings where id=target_booking_id;
  if not found then raise exception 'booking_not_found'; end if;
  -- Mesma regra de `cancel_booking`: o pagamento é da sua reserva, ou você gere
  -- o coworking que a vendeu.
  if not exists(
    select 1 from public.customers c
    where c.id=selected_booking.user_id
      and (c.auth_user_id=auth.uid() or public.can_manage_company(selected_booking.company_id))
  ) then raise exception 'booking_access_denied'; end if;
  insert into public.payments(company_id,booking_id,provider,provider_payment_id,amount_cents,payment_method,status,idempotency_key)
    values(selected_booking.company_id,selected_booking.id,'mercado_pago',target_provider_payment_id,selected_booking.total_cents,target_payment_method,'pending',target_idempotency_key)
    returning * into result;
  return result;
end;
$$;

commit;
