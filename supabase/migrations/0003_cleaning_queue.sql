-- A fila de limpeza precisa ser trabalhada pela operação, não só lida.
begin;

-- `can_manage_company` deixa de fora exatamente quem limpa a sala. Quem executa
-- a operação — recepção, equipe de limpeza — precisa avançar a própria fila.
create or replace function public.is_company_staff(target_company_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.company_members m
    where m.company_id=target_company_id
      and m.auth_user_id=auth.uid()
      and m.status='active'
      and m.role in ('employee','manager','admin','super_admin','cleaning')
  );
$$;

create policy cleaning_staff_update on public.cleaning_requests
  for update
  using (public.is_company_staff(company_id))
  with check (public.is_company_staff(company_id));

commit;
