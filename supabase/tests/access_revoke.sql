begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Cancelar uma reserva confirmada tem que fechar a porta agora, não no horário
-- em que a reunião cancelada teria acabado.

insert into auth.users(id,email)
values ('c1000000-0000-4000-8000-00000000000a','desistente@roomly.local');

insert into public.customers(id,auth_user_id,name,email)
values ('49000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-00000000000a','Cliente Desistente','desistente@roomly.local');

insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values ('79000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','49000000-0000-4000-8000-00000000000a',now()+interval '2 days',now()+interval '2 days 4 hours',48000,48000,'awaiting_payment',now()+interval '10 minutes','pgtap-revoke');

insert into public.payments(company_id,booking_id,provider,provider_payment_id,amount_cents,payment_method,status,idempotency_key)
values ('10000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-00000000000a','mercado_pago','mp-revoke-1',48000,'card','pending','pgtap-revoke');

set local role service_role;
select is(
  public.process_payment_event('evt-revoke','mp-revoke-1','approved',48000,'{}'::jsonb),
  'booking_confirmed',
  'a reserva confirma e agenda a revogação para depois da reunião'
);
reset role;

-- A senha já está na fechadura: é esse o estado que torna o cancelamento
-- perigoso, e é o único em que `cancel_booking` enfileira a revogação.
insert into public.booking_access_codes(company_id,booking_id,lock_id,provider,external_code_id,valid_from,valid_until,status)
values ('10000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-00000000000a','60000000-0000-4000-8000-000000000001','ttlock','ttlock-revoke-1',now()+interval '2 days',now()+interval '2 days 4 hours','active');

select ok(
  (select available_at from public.durable_jobs
   where dedupe_key='access.revoke:79000000-0000-4000-8000-00000000000a') > now() + interval '1 day',
  'antes do cancelamento a revogação está marcada para o fim da reserva'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$select public.cancel_booking('79000000-0000-4000-8000-00000000000a')$$,
  'o dono cancela a própria reserva confirmada'
);

reset role;

select is(
  (select status::text from public.bookings where id='79000000-0000-4000-8000-00000000000a'),
  'cancelled',
  'a reserva fica cancelada'
);

-- O defeito: `cancel_booking` insere a mesma dedupe_key com `do nothing`, então
-- a revogação continua agendada para o horário original. O cliente cancela,
-- recebe o reembolso, e o código dele abre a sala que já foi revendida.
select ok(
  (select available_at from public.durable_jobs
   where dedupe_key='access.revoke:79000000-0000-4000-8000-00000000000a') <= now(),
  'cancelar antecipa a revogação para agora'
);

select is(
  (select status::text from public.durable_jobs
   where dedupe_key='access.revoke:79000000-0000-4000-8000-00000000000a'),
  'pending',
  'a revogação continua na fila para ser executada'
);

/* ------------------------------------------- reembolso vindo do provedor */

-- O reembolso nunca revogou nada. Com a regra no gatilho, o dinheiro voltar
-- fecha a porta pelo mesmo caminho que o cancelamento.

insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,idempotency_key)
values ('79000000-0000-4000-8000-00000000000b','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','49000000-0000-4000-8000-00000000000a',now()+interval '3 days',now()+interval '3 days 2 hours',24000,24000,'confirmed','pgtap-revoke-reembolso');

insert into public.payments(company_id,booking_id,provider,provider_payment_id,amount_cents,payment_method,status,idempotency_key)
values ('10000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-00000000000b','mercado_pago','mp-revoke-2',24000,'card','approved','pgtap-revoke-reembolso');

insert into public.booking_access_codes(company_id,booking_id,lock_id,provider,external_code_id,valid_from,valid_until,status)
values ('10000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-00000000000b','60000000-0000-4000-8000-000000000002','ttlock','ttlock-revoke-2',now()+interval '3 days',now()+interval '3 days 2 hours','active');

set local role service_role;
select is(
  public.process_payment_event('evt-reembolso','mp-revoke-2','refunded',24000,'{}'::jsonb),
  'payment_updated',
  'o reembolso do provedor é registrado'
);
reset role;

select ok(
  (select available_at from public.durable_jobs
   where dedupe_key='access.revoke:79000000-0000-4000-8000-00000000000b') <= now(),
  'reembolsar também revoga o acesso agora'
);

select * from finish();
rollback;
