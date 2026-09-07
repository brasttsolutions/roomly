-- Limite para estender a reserva, decidido pela dona da sala.
--
-- A extensão soma tempo à reunião em curso. Mas perto do fim não faz sentido:
-- se faltam poucos minutos para acabar, não há o que estender. Quanto conta
-- como "perto do fim" é decisão de quem opera a sala — por isso é uma coluna
-- por sala, não uma regra fixa. Enquanto faltar MAIS que esse limite, a pessoa
-- estende quanto quiser (até o próximo horário ocupado); a partir dele, não.
--
-- Padrão de 5 minutos, para nenhuma sala existente mudar de comportamento de
-- forma brusca. Precisa de `db push` pelo dono.

begin;

alter table public.rooms
  add column if not exists extension_cutoff_minutes integer not null default 5;

alter table public.rooms
  drop constraint if exists rooms_extension_cutoff_range;
alter table public.rooms
  add constraint rooms_extension_cutoff_range
  check (extension_cutoff_minutes >= 0 and extension_cutoff_minutes <= 240);

commit;
