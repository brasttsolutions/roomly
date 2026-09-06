-- O desfecho do job passa a ser escrito só por quem ainda é dono dele.
--
-- `claim_durable_jobs` dá um lease de 2 minutos e reivindica de volta o que
-- passou disso. Mas `complete_durable_job` e `retry_durable_job` filtravam só
-- por `status='processing'`, sem nenhuma marca de posse: quem escrevia o
-- desfecho era quem chegasse por último.
--
-- Uma chamada externa lenta bastava. O worker A trava numa entrega, o lease
-- vence, o worker B reivindica e conclui, o A volta e pede retry: o job
-- executado com sucesso volta para a fila e roda uma terceira vez. Ou o inverso,
-- o A conclui enquanto o B ainda está no meio da chamada, e a falha do B some
-- sem deixar registro.
--
-- `attempts` já serve de marca: o claim incrementa, então cada dono tem um
-- número diferente e o worker já recebe o dele. Comparar é um compare-and-swap
-- sem coluna nova.

begin;

drop function if exists public.complete_durable_job(uuid);
drop function if exists public.retry_durable_job(uuid,text,boolean);

create function public.complete_durable_job(target_job_id uuid, target_attempts integer)
returns boolean language sql security definer set search_path=public as $$
  with escrita as (
    update public.durable_jobs
    set status='completed',lease_expires_at=null,last_error_code=null,updated_at=now()
    where id=target_job_id and status='processing' and attempts=target_attempts
    returning 1
  )
  select exists(select 1 from escrita);
$$;

create function public.retry_durable_job(
  target_job_id uuid,
  target_error_code text,
  target_manual_review boolean default false,
  target_attempts integer default null
) returns boolean language sql security definer set search_path=public as $$
  with escrita as (
    update public.durable_jobs
    set status=case when target_manual_review or attempts>=8 then 'manual_review'::public.job_status else 'pending'::public.job_status end,
        available_at=case when target_manual_review or attempts>=8 then available_at else now()+(least(3600,power(2,attempts)::integer*15)||' seconds')::interval end,
        lease_expires_at=null,last_error_code=left(target_error_code,120),updated_at=now()
    where id=target_job_id and status='processing'
      and (target_attempts is null or attempts=target_attempts)
    returning 1
  )
  select exists(select 1 from escrita);
$$;

revoke all on function public.complete_durable_job(uuid,integer) from public;
revoke all on function public.retry_durable_job(uuid,text,boolean,integer) from public;
grant execute on function public.complete_durable_job(uuid,integer) to service_role;
grant execute on function public.retry_durable_job(uuid,text,boolean,integer) to service_role;

commit;
