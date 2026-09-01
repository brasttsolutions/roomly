begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public','bookings','bookings table exists');
select has_table('public','durable_jobs','durable jobs table exists');
select has_function('public','create_booking_hold','booking RPC exists');
select has_function('public','process_payment_event','payment event RPC exists');
select has_function('public','claim_durable_jobs','job claim RPC exists');
select has_function('public','retry_durable_job','job retry RPC exists');
select ok(
  (select relrowsecurity from pg_class where oid='public.bookings'::regclass),
  'bookings has RLS enabled'
);

insert into public.profiles(id,company_id,name,email)
values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test Customer','test@roomly.local');

select lives_ok($test$
  insert into public.bookings(company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
  values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2026-09-10 14:00Z','2026-09-10 15:00Z',12000,12000,'awaiting_payment','2026-09-10 13:10Z','pgtap-booking-0001')
$test$,'first booking is accepted');

select throws_ok($test$
  insert into public.bookings(company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
  values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2026-09-10 14:30Z','2026-09-10 15:30Z',12000,12000,'awaiting_payment','2026-09-10 13:10Z','pgtap-booking-0002')
$test$,'23P01',null,'overlapping booking is rejected');

select lives_ok($test$
  insert into public.bookings(company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
  values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2026-09-10 15:00Z','2026-09-10 16:00Z',12000,12000,'awaiting_payment','2026-09-10 13:10Z','pgtap-booking-0003')
$test$,'adjacent half-open booking is accepted');

select throws_ok($test$
  insert into public.bookings(company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
  values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2026-09-10 17:00Z','2026-09-10 18:00Z',12000,11000,'awaiting_payment','2026-09-10 13:10Z','pgtap-booking-0004')
$test$,'23514',null,'invalid total is rejected');

select is(
  (select count(*)::integer from public.bookings where idempotency_key like 'pgtap-%'),
  2,
  'only valid non-overlapping bookings remain'
);

select * from finish();
rollback;
