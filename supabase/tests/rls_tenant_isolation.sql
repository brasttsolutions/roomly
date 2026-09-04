begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Empresa B é criada ao lado da empresa do seed (empresa A) para provar que a RLS
-- separa dois inquilinos, e não apenas dois usuários da mesma empresa.
insert into public.companies(id,name,document,email,timezone)
values ('11000000-0000-4000-8000-000000000002','Beta Coworking','11.111.111/0001-11','operacao@beta.example','America/Sao_Paulo');

insert into public.locations(id,company_id,name,address,city,state,zip_code,timezone)
values ('21000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002','Beta Centro','Rua B, 10','Joinville','SC','89200-000','America/Sao_Paulo');

insert into public.rooms(id,company_id,location_id,name,slug,description,capacity,hourly_price_cents)
values ('31000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000002','Sala Beta','sala-beta','Sala da empresa B.',6,9000);

insert into auth.users(id,email)
values
  ('a0000000-0000-4000-8000-00000000000a','cliente.a@roomly.local'),
  ('b0000000-0000-4000-8000-00000000000b','cliente.b@roomly.local');

insert into public.company_members(company_id,auth_user_id,role)
values
  ('10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-00000000000a','customer'),
  ('11000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-00000000000b','customer');

insert into public.profiles(id,company_id,auth_user_id,name,email)
values
  ('41000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-00000000000a','Cliente A','cliente.a@roomly.local'),
  ('41000000-0000-4000-8000-00000000000b','11000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-00000000000b','Cliente B','cliente.b@roomly.local');

insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values
  ('71000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-00000000000a','2026-10-01 14:00Z','2026-10-01 15:00Z',12000,12000,'confirmed',null,'rls-booking-a'),
  ('71000000-0000-4000-8000-00000000000b','11000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-00000000000b','2026-10-01 14:00Z','2026-10-01 15:00Z',9000,9000,'confirmed',null,'rls-booking-b');

insert into public.payments(company_id,booking_id,provider,provider_payment_id,payment_method,status,amount_cents,idempotency_key)
values
  ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-00000000000a','mercado_pago','rls-pay-a','pix','approved',12000,'rls-pay-key-a'),
  ('11000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-00000000000b','mercado_pago','rls-pay-b','pix','approved',9000,'rls-pay-key-b');

insert into public.audit_logs(company_id,request_id,entity_type,entity_id,action)
values ('10000000-0000-4000-8000-000000000001','rls-test-request','bookings','71000000-0000-4000-8000-00000000000a','booking.created');

-- A partir daqui o teste roda como o cliente da empresa B.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b0000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select is(auth.uid(),'b0000000-0000-4000-8000-00000000000b'::uuid,'a sessão de teste é o cliente da empresa B');

select is(
  (select count(*)::integer from public.bookings where company_id='10000000-0000-4000-8000-000000000001'),
  0,
  'cliente da empresa B não enxerga reservas da empresa A'
);

select is(
  (select count(*)::integer from public.bookings),
  1,
  'cliente da empresa B enxerga apenas a própria reserva'
);

select is(
  (select count(*)::integer from public.payments where company_id='10000000-0000-4000-8000-000000000001'),
  0,
  'cliente da empresa B não enxerga pagamentos da empresa A'
);

select is(
  (select count(*)::integer from public.audit_logs),
  0,
  'auditoria da empresa A permanece invisível para outro inquilino'
);

select is(
  (select count(*)::integer from public.locks),
  0,
  'fechaduras exigem papel de gestão e não vazam para clientes'
);

select is(
  (select count(*)::integer from public.companies where id='10000000-0000-4000-8000-000000000001'),
  0,
  'cadastro da empresa A não é legível por outro inquilino'
);

-- O catálogo é público de propósito: salas ativas continuam visíveis.
select is(
  (select count(*)::integer from public.rooms where status='active'),
  4,
  'catálogo público permanece legível em todos os inquilinos'
);

reset role;
select * from finish();
rollback;
