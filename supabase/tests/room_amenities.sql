begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- As colunas descritivas existem e as constraints protegem o que importa: o
-- mapa é link em página pública (nada de javascript:) e o tamanho é físico.

select has_column('public', 'rooms', 'size_sqm', 'rooms.size_sqm existe');
select has_column('public', 'rooms', 'arrival_instructions', 'rooms.arrival_instructions existe');

-- Um mapa http(s) é aceito; um javascript: é recusado pela CHECK.
select lives_ok(
  $$update public.rooms
      set map_url='https://maps.example/x'
      where id='30000000-0000-4000-8000-000000000001'$$,
  'map_url https é aceito'
);
select throws_ok(
  $$update public.rooms
      set map_url='javascript:alert(1)'
      where id='30000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'map_url javascript: é recusado pela constraint'
);

select * from finish();
rollback;
