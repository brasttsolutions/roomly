begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Um worker cuja chamada externa demorou mais que o lease não pode escrever o
-- desfecho de um job que já é de outro.

insert into public.durable_jobs(company_id,kind,payload,dedupe_key,available_at)
values ('10000000-0000-4000-8000-000000000001','booking.expire','{"bookingId":"x"}'::jsonb,'pgtap-lease',now());

set local role service_role;

select is(
  (select attempts from public.claim_durable_jobs(1) where dedupe_key='pgtap-lease'),
  1,
  'o primeiro worker reivindica e leva a tentativa 1'
);

-- O lease vence enquanto o worker A está preso numa chamada externa.
update public.durable_jobs set lease_expires_at=now()-interval '1 second'
where dedupe_key='pgtap-lease';

select is(
  (select attempts from public.claim_durable_jobs(1) where dedupe_key='pgtap-lease'),
  2,
  'o lease vencido é reivindicado pelo segundo worker'
);

select is(
  public.complete_durable_job(
    (select id from public.durable_jobs where dedupe_key='pgtap-lease'), 1),
  false,
  'o worker atrasado não conclui um job que já não é dele'
);

select is(
  (select status::text from public.durable_jobs where dedupe_key='pgtap-lease'),
  'processing',
  'o job continua com o dono atual'
);

select is(
  public.retry_durable_job(
    (select id from public.durable_jobs where dedupe_key='pgtap-lease'),
    'erro_do_atrasado', false, 1),
  false,
  'o worker atrasado também não devolve o job para a fila'
);

select is(
  public.complete_durable_job(
    (select id from public.durable_jobs where dedupe_key='pgtap-lease'), 2),
  true,
  'o dono atual conclui normalmente'
);

reset role;
select * from finish();
rollback;
