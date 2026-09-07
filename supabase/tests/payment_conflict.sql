begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Fecha o furo do `record_pending_payment`: separa retentativa idempotente de
-- colisão com pagamento de terceiro, e impede duas pendências na mesma reserva.

insert into auth.users(id,email)
values
  ('c1000000-0000-4000-8000-00000000000a','conflito.a@roomly.local'),
  ('c2000000-0000-4000-8000-00000000000c','conflito.c@roomly.local');

insert into public.customers(id,auth_user_id,name,email)
values
  ('48000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-00000000000a','Cliente A','conflito.a@roomly.local'),
  ('48000000-0000-4000-8000-00000000000c','c2000000-0000-4000-8000-00000000000c','Cliente C','conflito.c@roomly.local');

-- Duas reservas de donos diferentes, ambas na sala/empresa do seed.
insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values
  ('78000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-00000000000a','2026-12-02 14:00Z','2026-12-02 15:00Z',12000,12000,'awaiting_payment',now()+interval '10 minutes','pgtap-conflict-a'),
  ('78000000-0000-4000-8000-00000000000c','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','48000000-0000-4000-8000-00000000000c','2026-12-02 14:00Z','2026-12-02 15:00Z',7500,7500,'awaiting_payment',now()+interval '10 minutes','pgtap-conflict-c');

set local role authenticated;

-- 1. Cliente A registra o pagamento 'mp-shared' na própria reserva.
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$select public.record_pending_payment(
      '78000000-0000-4000-8000-00000000000a','mp-shared','pix','key-a-1')$$,
  'o dono registra o pagamento pendente da própria reserva'
);

-- 2. A MESMA chamada de novo (mesma reserva, mesmo id, mesma chave) é a
-- retentativa idempotente: devolve a linha existente, sem duplicar nem estourar.
select is(
  (select (public.record_pending_payment(
      '78000000-0000-4000-8000-00000000000a','mp-shared','pix','key-a-1')).provider_payment_id),
  'mp-shared',
  'retentativa idempotente devolve a mesma linha, sem erro'
);

select is(
  (select count(*)::integer from public.payments where provider_payment_id='mp-shared'),
  1,
  'a retentativa não cria uma segunda linha de pagamento'
);

-- 3. Cliente C tenta registrar na SUA reserva o id de pagamento que pertence à
-- reserva de A: colisão de terceiro, recusada.
set local request.jwt.claims = '{"sub":"c2000000-0000-4000-8000-00000000000c","role":"authenticated"}';
select throws_ok(
  $$select public.record_pending_payment(
      '78000000-0000-4000-8000-00000000000c','mp-shared','pix','key-c-1')$$,
  'payment_id_conflict',
  'id de pagamento de outra reserva é recusado, não engolido como sucesso'
);

-- 4. Cliente A tenta uma SEGUNDA pendência na mesma reserva com outra chave e
-- outro id: uma reserva não acumula pagamentos pendentes.
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select throws_ok(
  $$select public.record_pending_payment(
      '78000000-0000-4000-8000-00000000000a','mp-other','pix','key-a-2')$$,
  'payment_already_pending',
  'a mesma reserva não abre uma segunda pendência de pagamento'
);

reset role;
select * from finish();
rollback;
