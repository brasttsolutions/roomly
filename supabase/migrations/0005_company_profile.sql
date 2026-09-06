-- Perfil público do coworking.
--
-- `companies` guarda CNPJ, e-mail e telefone da operação. RLS é por linha, não
-- por coluna: liberar a tabela para leitura anônima exporia esses três junto com
-- o nome. A view abaixo publica só o que é de fato público, e é ela que o
-- catálogo lê.

begin;

alter table public.companies
  add column slug text,
  add column description text,
  add column logo_url text,
  add column website_url text;

-- Slug a partir do nome: sem acento, sem pontuação, sem hífen duplicado nem nas
-- pontas. `unaccent` não está instalada, então a transliteração é explícita.
update public.companies
set slug = btrim(regexp_replace(
  lower(translate(name,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
  '[^a-z0-9]+', '-', 'g'), '-')
where slug is null;

-- Nomes iguais em empresas diferentes produziriam o mesmo slug; o sufixo mantém
-- a unicidade sem depender de quem cadastrou escolher outro nome.
update public.companies c
set slug = c.slug || '-' || left(replace(c.id::text, '-', ''), 6)
where exists (
  select 1 from public.companies o
  where o.slug = c.slug and o.id <> c.id
);

-- Sem isto, `slug not null` quebraria toda criação de empresa: nada no produto
-- gera esse valor, e quem cadastra pelo painel informa só o nome.
create or replace function public.company_slug_from_name()
returns trigger language plpgsql set search_path = public as $$
declare base text; candidate text; suffix integer := 1;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;
  base := btrim(regexp_replace(
    lower(translate(new.name,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
    '[^a-z0-9]+', '-', 'g'), '-');
  if base = '' then base := 'coworking'; end if;
  candidate := base;
  while exists (select 1 from public.companies where slug = candidate and id <> new.id) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create trigger companies_slug_before_write
  before insert or update of name, slug on public.companies
  for each row execute function public.company_slug_from_name();

alter table public.companies
  alter column slug set not null,
  add constraint companies_slug_unique unique (slug),
  add constraint companies_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint companies_website_url_scheme
    check (website_url is null or website_url ~ '^https?://'),
  add constraint companies_logo_url_scheme
    check (logo_url is null or logo_url ~ '^https://');

/* ------------------------------------------------------------ view pública */

-- Só as colunas que o perfil mostra. Sem `security_invoker`, a view roda com os
-- privilégios de quem a criou, então a RLS de `companies` não se aplica aqui —
-- e é justamente por isso que a lista de colunas é a fronteira.
create view public.company_profiles as
select id, slug, name, description, logo_url, website_url
from public.companies
where status = 'active';

grant select on public.company_profiles to anon, authenticated;

comment on view public.company_profiles is
  'Perfil público do coworking. Nunca inclua document, email ou phone aqui.';

commit;
