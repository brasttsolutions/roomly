begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- A grade não oferece o bloco colado no fim de uma reserva, porque a sala ainda
-- está sendo preparada. `create_booking_hold` aceitava esse mesmo bloco, e a
-- função é executável direto pelo PostgREST por qualquer pessoa autenticada.

insert into auth.users(id,email)
values ('d1000000-0000-4000-8000-00000000000a','apressado@roomly.local');

insert into public.customers(id,auth_user_id,name,email)
values ('50000000-0000-4000-8000-00000000000a','d1000000-0000-4000-8000-00000000000a','Cliente Apressado','apressado@roomly.local');

-- Sala Executiva prepara em 20 minutos, então 14:00–15:00 ocupa até 15:20.
insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,idempotency_key)
values ('7a000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-00000000000a','2027-03-01 14:00Z','2027-03-01 15:00Z',12000,12000,'confirmed','pgtap-limpeza-base');

select is(
  (select count(*)::integer from public.room_busy_intervals(
     array['30000000-0000-4000-8000-000000000001']::uuid[],
     '2027-03-01 15:00Z','2027-03-01 15:20Z')
   where kind='cleaning'),
  1,
  'a grade marca os 20 minutos seguintes como preparo'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select throws_ok(
  $$select public.create_booking_hold(
      '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-00000000000a',
      '2027-03-01 15:00Z','2027-03-01 16:00Z','pgtap-limpeza-colado')$$,
  'room_unavailable_during_cleaning',
  'reservar dentro do preparo é recusado, não vendido sujo'
);

-- Preparo também vale para trás: terminar colado ao início de outra reserva
-- deixaria a sala suja para quem chega.
select throws_ok(
  $$select public.create_booking_hold(
      '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-00000000000a',
      '2027-03-01 13:00Z','2027-03-01 14:00Z','pgtap-limpeza-antes')$$,
  'room_unavailable_during_cleaning',
  'terminar colado ao início da próxima também é recusado'
);

select lives_ok(
  $$select public.create_booking_hold(
      '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-00000000000a',
      '2027-03-01 15:20Z','2027-03-01 16:20Z','pgtap-limpeza-respeitado')$$,
  'o primeiro bloco depois do preparo continua reservável'
);

reset role;
select * from finish();
rollback;
