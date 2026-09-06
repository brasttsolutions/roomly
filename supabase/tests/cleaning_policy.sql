begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- A empresa do seed (A) e uma segunda empresa (B), para provar que a permissão
-- de limpar não atravessa inquilinos.
insert into public.companies(id,name,document,email,timezone)
values ('12000000-0000-4000-8000-000000000003','Gama Coworking','22.222.222/0001-22','operacao@gama.example','America/Sao_Paulo');

insert into auth.users(id,email)
values
  ('d0000000-0000-4000-8000-00000000000d','faxina.a@roomly.local'),
  ('e0000000-0000-4000-8000-00000000000e','faxina.b@roomly.local'),
  ('f0000000-0000-4000-8000-00000000000f','cliente.c@roomly.local');

insert into public.company_members(company_id,auth_user_id,role)
values
  ('10000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-00000000000d','cleaning'),
  ('12000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-00000000000e','cleaning'),
  ('10000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-00000000000f','customer');

insert into public.customers(id,auth_user_id,name,email)
values ('46000000-0000-4000-8000-00000000000f','f0000000-0000-4000-8000-00000000000f','Cliente C','cliente.c@roomly.local');

insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values ('76000000-0000-4000-8000-00000000000d','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','46000000-0000-4000-8000-00000000000f','2026-11-10 14:00Z','2026-11-10 15:00Z',12000,12000,'completed',null,'pgtap-cleaning-policy');

insert into public.cleaning_requests(id,company_id,booking_id,room_id,scheduled_at)
values ('81000000-0000-4000-8000-00000000000d','10000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-00000000000d','30000000-0000-4000-8000-000000000001','2026-11-10 15:00Z');

set local role authenticated;

-- 1. A equipe de limpeza da empresa A avança a própria fila.
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-00000000000d","role":"authenticated"}';

select is(
  (select count(*)::integer from public.cleaning_requests),
  1,
  'a equipe de limpeza enxerga a fila da própria empresa'
);

update public.cleaning_requests
set status='in_progress', started_at=now()
where id='81000000-0000-4000-8000-00000000000d';

select is(
  (select status from public.cleaning_requests where id='81000000-0000-4000-8000-00000000000d'),
  'in_progress',
  'quem limpa consegue marcar a limpeza como iniciada'
);

update public.cleaning_requests
set status='completed', completed_at=now()
where id='81000000-0000-4000-8000-00000000000d';

select is(
  (select status from public.cleaning_requests where id='81000000-0000-4000-8000-00000000000d'),
  'completed',
  'quem limpa consegue concluir a limpeza'
);

-- 2. Um cliente da mesma empresa não mexe na fila.
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-00000000000f","role":"authenticated"}';

update public.cleaning_requests set status='cancelled'
where id='81000000-0000-4000-8000-00000000000d';

select is(
  (select status from public.cleaning_requests where id='81000000-0000-4000-8000-00000000000d'),
  'completed',
  'cliente não altera a fila de limpeza, mesmo sendo da empresa'
);

-- 3. A equipe de limpeza da empresa B não alcança a fila da empresa A.
set local request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000e","role":"authenticated"}';

update public.cleaning_requests set status='cancelled'
where id='81000000-0000-4000-8000-00000000000d';

select is(
  (select count(*)::integer from public.cleaning_requests where status='cancelled'),
  0,
  'limpeza de outro inquilino não alcança esta fila'
);

reset role;
select * from finish();
rollback;
