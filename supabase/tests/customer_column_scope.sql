begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- A política `customers_self_update` prende a LINHA (auth_user_id = auth.uid())
-- mas não a COLUNA: sem escopo de coluna, o cliente reescrevia o próprio
-- `email`, `status` e `auth_user_id` via PATCH REST — inclusive fazendo squat do
-- e-mail de um terceiro e provocando lockout silencioso da vítima.
--
-- name/phone continuam editáveis; email/status/auth_user_id, não.

insert into auth.users(id,email)
values ('d1000000-0000-4000-8000-00000000000a','coluna.a@roomly.local');

insert into public.customers(id,auth_user_id,name,email,phone,status)
values ('49000000-0000-4000-8000-00000000000a','d1000000-0000-4000-8000-00000000000a','Cliente Coluna','coluna.a@roomly.local','(47) 90000-0000','active');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-00000000000a","role":"authenticated"}';

-- Editáveis: nome e telefone.
select lives_ok(
  $$update public.customers set name='Novo Nome' where auth_user_id='d1000000-0000-4000-8000-00000000000a'$$,
  'o cliente edita o próprio nome'
);
select lives_ok(
  $$update public.customers set phone='(47) 91111-1111' where auth_user_id='d1000000-0000-4000-8000-00000000000a'$$,
  'o cliente edita o próprio telefone'
);

-- Bloqueados: e-mail, status e vínculo de autenticação (42501 = privilégio
-- insuficiente na coluna).
select throws_ok(
  $$update public.customers set email='vitima@roomly.local' where auth_user_id='d1000000-0000-4000-8000-00000000000a'$$,
  '42501',
  null,
  'PATCH de email é recusado por falta de privilégio na coluna'
);
select throws_ok(
  $$update public.customers set status='inactive' where auth_user_id='d1000000-0000-4000-8000-00000000000a'$$,
  '42501',
  null,
  'PATCH de status é recusado'
);
select throws_ok(
  $$update public.customers set auth_user_id='00000000-0000-4000-8000-000000000000' where auth_user_id='d1000000-0000-4000-8000-00000000000a'$$,
  '42501',
  null,
  'PATCH de auth_user_id é recusado'
);

reset role;
select * from finish();
rollback;
