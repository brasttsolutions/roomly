begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- O caminho que cobra o cartão: hold criado, cobrança feita no provedor,
-- pagamento registrado. Quem reserva é cliente da plataforma e não tem perfil
-- em `profiles` — foi exatamente por isso que o registro quebrava.

insert into auth.users(id,email)
values
  ('a1000000-0000-4000-8000-00000000000a','pagante@roomly.local'),
  ('a2000000-0000-4000-8000-00000000000b','estranho@roomly.local');

insert into public.customers(id,auth_user_id,name,email)
values
  ('47000000-0000-4000-8000-00000000000a','a1000000-0000-4000-8000-00000000000a','Cliente Pagante','pagante@roomly.local'),
  ('47000000-0000-4000-8000-00000000000b','a2000000-0000-4000-8000-00000000000b','Cliente Estranho','estranho@roomly.local');

insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values ('77000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','47000000-0000-4000-8000-00000000000a','2026-12-01 14:00Z','2026-12-01 15:00Z',12000,12000,'awaiting_payment',now()+interval '10 minutes','pgtap-payment-record');

set local role authenticated;

-- 1. O dono da reserva registra o próprio pagamento.
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$select public.record_pending_payment(
      '77000000-0000-4000-8000-00000000000a','mp-teste-1','card','pgtap-payment-record')$$,
  'cliente da plataforma registra o pagamento da própria reserva'
);

select is(
  (select amount_cents from public.payments where provider_payment_id='mp-teste-1'),
  12000,
  'o valor cobrado vem da reserva, não do cliente'
);

-- 2. Sem linha em `payments`, a notificação do provedor não acha o pagamento e
-- a reserva nunca confirma: é a linha acima que sustenta o webhook.
select is(
  (select status::text from public.payments where provider_payment_id='mp-teste-1'),
  'pending',
  'o pagamento nasce pendente, à espera da notificação'
);

-- 3. Outro cliente não registra pagamento na reserva alheia.
set local request.jwt.claims = '{"sub":"a2000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select throws_ok(
  $$select public.record_pending_payment(
      '77000000-0000-4000-8000-00000000000a','mp-teste-2','card','pgtap-payment-alheio')$$,
  'booking_access_denied',
  'pagamento na reserva de outra pessoa é recusado'
);

reset role;
select * from finish();
rollback;
