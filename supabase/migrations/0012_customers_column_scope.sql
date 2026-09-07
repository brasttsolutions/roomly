-- Escopo de coluna no UPDATE de `customers`.
--
-- A política `customers_self_update` (0004) prende a LINHA à sessão, mas não a
-- COLUNA, e `authenticated` recebe UPDATE em todas as colunas pelo default de
-- privilégios do Supabase. Resultado: via PATCH REST o cliente reescrevia o
-- próprio `email`, `status` e `auth_user_id` — dava para fazer squat do e-mail
-- de um terceiro (a coluna é `unique`) e causar lockout silencioso da vítima, e
-- para se auto-reativar depois de um `status='inactive'` administrativo.
--
-- Correção por privilégio de coluna: revoga o UPDATE amplo de `authenticated` e
-- concede de volta apenas `name` e `phone`. A política RLS continua valendo para
-- a linha. O caminho legítimo do app (edição de conta) usa a chave de serviço
-- (`service_role`), que NÃO é afetada por este revoke — logo nome/telefone
-- seguem editáveis pelo produto, e email/status/auth_user_id ficam fora do
-- alcance do cliente.
--
-- Precisa de `db push` pelo dono.

begin;

revoke update on public.customers from authenticated;
grant update (name, phone) on public.customers to authenticated;

commit;
