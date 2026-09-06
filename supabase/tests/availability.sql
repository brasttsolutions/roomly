begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_column('public','locations','opening_time','locations carry an opening time');
select has_column('public','locations','closing_time','locations carry a closing time');
select has_function('public','room_busy_intervals','availability RPC exists');

update public.rooms set cleaning_time_minutes=20
where id='30000000-0000-4000-8000-000000000001';

insert into auth.users(id,email)
values ('a1000000-0000-4000-8000-0000000000a1','availability@roomly.local');
insert into public.customers(id,auth_user_id,name,email)
values ('40000000-0000-4000-8000-0000000000a1','a1000000-0000-4000-8000-0000000000a1','Availability Customer','availability@roomly.local');

-- Uma reserva confirmada, um hold vencido e uma reserva cancelada. Só a
-- primeira pode aparecer como ocupação.
insert into public.bookings(company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values
  ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-0000000000a1',now()+interval '2 days',now()+interval '2 days 1 hour',12000,12000,'confirmed',null,'pgtap-availability-confirmed'),
  ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-0000000000a1',now()+interval '3 days',now()+interval '3 days 1 hour',12000,12000,'awaiting_payment',now()-interval '1 minute','pgtap-availability-expired'),
  ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-0000000000a1',now()+interval '4 days',now()+interval '4 days 1 hour',12000,12000,'cancelled',null,'pgtap-availability-cancelled');

select is(
  (select count(*)::integer from public.room_busy_intervals(
     array['30000000-0000-4000-8000-000000000001']::uuid[],
     now()+interval '47 hours', now()+interval '50 hours') where kind='booked'),
  1,
  'a confirmed booking is reported as busy'
);

select is(
  (select end_at from public.room_busy_intervals(
     array['30000000-0000-4000-8000-000000000001']::uuid[],
     now()+interval '47 hours', now()+interval '50 hours') where kind='cleaning'),
  (select end_at+interval '20 minutes' from public.bookings where idempotency_key='pgtap-availability-confirmed'),
  'the cleaning window follows the booking by cleaning_time_minutes'
);

select is(
  (select count(*)::integer from public.room_busy_intervals(
     array['30000000-0000-4000-8000-000000000001']::uuid[],
     now()+interval '71 hours', now()+interval '74 hours')),
  0,
  'an expired hold no longer blocks the slot'
);

select is(
  (select count(*)::integer from public.room_busy_intervals(
     array['30000000-0000-4000-8000-000000000001']::uuid[],
     now()+interval '95 hours', now()+interval '98 hours')),
  0,
  'a cancelled booking no longer blocks the slot'
);

-- O ponto da função: quem não é dono nem gestor enxerga a ocupação, e nada
-- além dela. A RLS de `bookings` continua fechada para o mesmo papel.
set local role anon;
select is(
  (select count(*)::integer from public.room_busy_intervals(
     array['30000000-0000-4000-8000-000000000001']::uuid[],
     now()+interval '47 hours', now()+interval '50 hours') where kind='booked'),
  1,
  'anon reads occupancy through the function'
);
reset role;

select * from finish();
rollback;
