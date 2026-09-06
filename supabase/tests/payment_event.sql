begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- A notificação do Mercado Pago é o que transforma dinheiro em reserva. Até
-- aqui o único teste desta função era "ela existe" — e foi debaixo dessa
-- lacuna que `record_pending_payment` ficou quebrada sem ninguém ver.

insert into auth.users(id,email)
values ('b1000000-0000-4000-8000-00000000000a','pagador@roomly.local');

insert into public.customers(id,auth_user_id,name,email)
values ('48000000-0000-4000-8000-00000000000a','b1000000-0000-4000-8000-00000000000a','Cliente Pagador','pagador@roomly.local');

-- Três reservas: a que confirma, a que perdeu o hold e a que é recusada.
insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values
  ('78000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-00000000000a','2026-12-02 14:00Z','2026-12-02 15:00Z',12000,12000,'awaiting_payment',now()+interval '10 minutes','pgtap-evento-ok'),
  ('78000000-0000-4000-8000-00000000000b','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-00000000000a','2026-12-03 14:00Z','2026-12-03 15:00Z',12000,12000,'awaiting_payment',now()-interval '1 minute','pgtap-evento-vencido'),
  ('78000000-0000-4000-8000-00000000000c','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-00000000000a','2026-12-04 14:00Z','2026-12-04 15:00Z',12000,12000,'awaiting_payment',now()+interval '10 minutes','pgtap-evento-recusado');

insert into public.payments(company_id,booking_id,provider,provider_payment_id,amount_cents,payment_method,status,idempotency_key)
values
  ('10000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-00000000000a','mercado_pago','mp-evento-1',12000,'card','pending','pgtap-evento-ok'),
  ('10000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-00000000000b','mercado_pago','mp-evento-2',12000,'card','pending','pgtap-evento-vencido'),
  ('10000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-00000000000c','mercado_pago','mp-evento-3',12000,'card','pending','pgtap-evento-recusado');

set local role service_role;

/* --------------------------------------------- 1. o caminho que dá certo */

select is(
  public.process_payment_event('evt-1','mp-evento-1','approved',12000,'{}'::jsonb),
  'booking_confirmed',
  'pagamento aprovado confirma a reserva'
);

select is(
  (select status::text from public.bookings where id='78000000-0000-4000-8000-00000000000a'),
  'confirmed',
  'a reserva sai de awaiting_payment'
);

select is(
  (select hold_expires_at from public.bookings where id='78000000-0000-4000-8000-00000000000a'),
  null,
  'o contador do hold para de correr'
);

select isnt(
  (select paid_at from public.payments where provider_payment_id='mp-evento-1'),
  null,
  'o pagamento registra quando foi pago'
);

-- Sem estes jobs a pessoa paga e não recebe nem o código da porta nem o
-- e-mail: a confirmação no banco não basta.
select is(
  (select count(*)::integer from public.durable_jobs
   where kind in ('access.provision','notification.send','booking.complete','access.revoke')
     and payload->>'bookingId'='78000000-0000-4000-8000-00000000000a'),
  4,
  'confirmar enfileira acesso, e-mail, encerramento e revogação'
);

-- A 0006 marca a limpeza na virada para `confirmed`, não no fim da reunião.
select is(
  (select count(*)::integer from public.durable_jobs
   where kind='cleaning.request' and payload->>'bookingId'='78000000-0000-4000-8000-00000000000a'),
  1,
  'confirmar agenda a limpeza da sala'
);

/* ------------------------------------------------- 2. o mesmo evento duas vezes */

select is(
  public.process_payment_event('evt-1','mp-evento-1','approved',12000,'{}'::jsonb),
  'duplicate',
  'a notificação repetida não cobra nem confirma de novo'
);

/* ------------------------------------------- 3. valor diferente do combinado */

select is(
  public.process_payment_event('evt-2','mp-evento-3','approved',9900,'{}'::jsonb),
  'manual_review',
  'valor diferente do da reserva vai para conferência humana'
);

/* ---------------------------------------------------- 4. hold já vencido */

-- Dinheiro entrou depois de o horário voltar para a grade: confirmar seria
-- vender duas vezes o mesmo horário.
select is(
  public.process_payment_event('evt-3','mp-evento-2','approved',12000,'{}'::jsonb),
  'manual_review',
  'aprovação depois do hold vencido não confirma sozinha'
);

/* ------------------------------------------------------- 5. recusa */

select is(
  public.process_payment_event('evt-4','mp-evento-3','rejected',12000,'{}'::jsonb),
  'payment_updated',
  'a recusa é registrada'
);

select is(
  (select status::text from public.bookings where id='78000000-0000-4000-8000-00000000000c'),
  'cancelled',
  'a recusa devolve o horário para a grade'
);

reset role;
select * from finish();
rollback;
