begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- O limite de extensão por sala existe, tem padrão 5 e recusa valor fora da faixa.

select has_column('public', 'rooms', 'extension_cutoff_minutes', 'coluna existe');

select is(
  (select extension_cutoff_minutes
     from public.rooms
     where id='30000000-0000-4000-8000-000000000001'),
  5,
  'padrão é 5 minutos'
);

select throws_ok(
  $$update public.rooms
      set extension_cutoff_minutes = 999
      where id='30000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'valor fora da faixa é recusado pela constraint'
);

select * from finish();
rollback;
