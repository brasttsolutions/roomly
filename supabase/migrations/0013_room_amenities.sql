-- Campos descritivos da sala, para a página parecer um produto pronto.
--
-- Até aqui a sala tinha nome, capacidade, preço e uma lista solta de recursos.
-- Faltavam os dados que quem vai reservar procura antes de decidir: tamanho,
-- se tem Wi-Fi, ar-condicionado, café e estacionamento, um mapa e as instruções
-- de chegada. Todos são opcionais e nascem vazios/falsos — nenhuma sala
-- existente fica inválida, e o dono preenche pelo painel.
--
-- Precisa de `db push` pelo dono.

begin;

alter table public.rooms
  add column if not exists size_sqm numeric(6,1),
  add column if not exists has_wifi boolean not null default false,
  add column if not exists has_air_conditioning boolean not null default false,
  add column if not exists has_coffee boolean not null default false,
  add column if not exists has_parking boolean not null default false,
  add column if not exists map_url text,
  add column if not exists arrival_instructions text;

-- O mapa é renderizado como link numa página pública; a mesma trava dos links de
-- perfil vale aqui, para um `javascript:` não virar clique perigoso.
alter table public.rooms
  drop constraint if exists rooms_map_url_scheme;
alter table public.rooms
  add constraint rooms_map_url_scheme
  check (map_url is null or map_url ~ '^https?://');

-- Tamanho é medida física: não faz sentido negativo nem absurdo.
alter table public.rooms
  drop constraint if exists rooms_size_sqm_range;
alter table public.rooms
  add constraint rooms_size_sqm_range
  check (size_sqm is null or (size_sqm > 0 and size_sqm <= 10000));

commit;
