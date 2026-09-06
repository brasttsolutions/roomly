begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users(id,email) values ('c0000000-0000-4000-8000-00000000000c','limpeza@roomly.local');
insert into public.customers(id,auth_user_id,name,email)
values ('45000000-0000-4000-8000-00000000000c','c0000000-0000-4000-8000-00000000000c','Cliente Limpeza','limpeza@roomly.local');

-- Avisar 30 minutos ANTES do fim: o caso que era impossível antes desta migração.
update public.rooms set cleaning_notice_offset_minutes = -30
where id = '30000000-0000-4000-8000-000000000001';

insert into public.bookings(id,company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,total_cents,status,hold_expires_at,idempotency_key)
values ('75000000-0000-4000-8000-00000000000c','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','45000000-0000-4000-8000-00000000000c','2026-11-05 14:00Z','2026-11-05 16:00Z',24000,24000,'awaiting_payment','2026-11-05 13:10Z','pgtap-cleaning-notice');

select is(
  (select count(*)::integer from public.durable_jobs where dedupe_key='cleaning.request:75000000-0000-4000-8000-00000000000c'),
  0,
  'reserva aguardando pagamento ainda não agenda aviso de limpeza'
);

update public.bookings set status='confirmed' where id='75000000-0000-4000-8000-00000000000c';

select is(
  (select count(*)::integer from public.durable_jobs where dedupe_key='cleaning.request:75000000-0000-4000-8000-00000000000c'),
  1,
  'confirmar a reserva agenda o aviso de limpeza'
);

select is(
  (select available_at from public.durable_jobs where dedupe_key='cleaning.request:75000000-0000-4000-8000-00000000000c'),
  '2026-11-05 15:30Z'::timestamptz,
  'o aviso sai 30 minutos antes do fim, e não no fim'
);

-- Uma segunda atualização não pode duplicar o job.
update public.bookings set status='in_progress' where id='75000000-0000-4000-8000-00000000000c';
update public.bookings set status='confirmed' where id='75000000-0000-4000-8000-00000000000c';

select is(
  (select count(*)::integer from public.durable_jobs where dedupe_key='cleaning.request:75000000-0000-4000-8000-00000000000c'),
  1,
  'reconfirmar não duplica o aviso'
);

select * from finish();
rollback;
