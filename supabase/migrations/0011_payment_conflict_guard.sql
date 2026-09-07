-- Fechar o furo do registro de pagamento pendente.
--
-- Antes, `record_pending_payment` inseria um `provider_payment_id` de texto
-- livre e, se ele já existisse, o `unique (provider, provider_payment_id)`
-- estourava `23505` — que o repositório (`booking-repository.ts`) tratava
-- cegamente como sucesso. Consequências:
--   * um cliente podia registrar na SUA reserva o `provider_payment_id` de OUTRA
--     reserva; o `23505` era engolido, a chamada "dava certo", e a notificação
--     daquele pagamento passava a mexer no vínculo errado;
--   * nada impedia uma reserva de acumular vários pagamentos pendentes.
--
-- Esta migração:
--   1. Reescreve a função para separar "minha retentativa idempotente" (mesma
--      reserva + mesmo pagamento + mesma chave → devolve a linha existente) de
--      "colisão com pagamento de terceiro" (id já pertence a OUTRA reserva →
--      `payment_id_conflict`) e de "reserva já tem pendência" com outra chave
--      (`payment_already_pending`).
--   2. Adiciona índice único parcial: no máximo um pagamento pendente por
--      reserva, como defesa em profundidade além da checagem da função.
--
-- Precisa de `db push` pelo dono.

begin;

-- Defesa em profundidade: uma reserva só pode ter UM pagamento pendente por vez.
-- Pagamentos que saíram de 'pending' (approved/rejected/refunded/manual_review)
-- não contam, então uma nova tentativa após recusa continua possível.
create unique index if not exists payments_one_pending_per_booking
  on public.payments(booking_id)
  where status = 'pending';

create or replace function public.record_pending_payment(
  target_booking_id uuid,
  target_provider_payment_id text,
  target_payment_method text,
  target_idempotency_key text
) returns public.payments
language plpgsql security definer set search_path=public as $$
declare
  selected_booking public.bookings;
  existing public.payments;
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

  -- Este id de pagamento já existe? Só é aceitável se for a MESMA reserva e a
  -- MESMA chave de idempotência: aí é a retentativa idempotente legítima e
  -- devolvemos a linha que já está lá. Qualquer outra combinação é colisão.
  select * into existing from public.payments
    where provider='mercado_pago' and provider_payment_id=target_provider_payment_id;
  if found then
    if existing.booking_id = selected_booking.id
       and existing.idempotency_key = target_idempotency_key then
      return existing;
    end if;
    raise exception 'payment_id_conflict';
  end if;

  -- Uma reserva não acumula pendências. Se já há uma pendente com outra chave,
  -- recusa em vez de criar uma segunda cobrança fantasma.
  if exists(
    select 1 from public.payments
    where booking_id=selected_booking.id
      and status='pending'
      and idempotency_key <> target_idempotency_key
  ) then raise exception 'payment_already_pending'; end if;

  begin
    insert into public.payments(company_id,booking_id,provider,provider_payment_id,amount_cents,payment_method,status,idempotency_key)
      values(selected_booking.company_id,selected_booking.id,'mercado_pago',target_provider_payment_id,selected_booking.total_cents,target_payment_method,'pending',target_idempotency_key)
      returning * into result;
  exception when unique_violation then
    -- Corrida: outra transação inseriu entre a checagem e o insert. Se a linha
    -- vencedora é a minha (mesma reserva, mesma chave), devolvo — idempotente.
    -- Caso contrário é colisão de verdade.
    select * into existing from public.payments
      where provider='mercado_pago' and provider_payment_id=target_provider_payment_id;
    if found
       and existing.booking_id = selected_booking.id
       and existing.idempotency_key = target_idempotency_key then
      return existing;
    end if;
    raise exception 'payment_id_conflict';
  end;
  return result;
end;
$$;

commit;
