-- Disponibilidade pública: expediente da unidade e leitura anônima de ocupação.
begin;

-- O expediente vive na unidade, não na sala: quem abre e fecha o prédio é a
-- operação da unidade, e todas as salas dela seguem o mesmo horário.
alter table public.locations
  add column opening_time time not null default '08:00',
  add column closing_time time not null default '20:00';

alter table public.locations
  add constraint locations_business_hours check (closing_time > opening_time);

-- Ocupação é informação pública de uma sala à venda: quem olha o catálogo
-- precisa saber que 14h está tomado. Quem reservou, não.
--
-- A RLS de `bookings` restringe a leitura ao dono e aos gestores, e é assim que
-- deve continuar. Esta função devolve apenas o intervalo e o motivo — nunca o
-- id da reserva, o usuário ou o valor — então roda como `security definer`
-- sobre a tabela sem afrouxar a política.
create or replace function public.room_busy_intervals(
  target_room_ids uuid[],
  target_from timestamptz,
  target_to timestamptz
) returns table (room_id uuid, start_at timestamptz, end_at timestamptz, kind text)
language sql
stable
security definer
set search_path = public
as $$
  select x.room_id, x.start_at, x.end_at, x.kind
    from (
      -- A reserva em si. `awaiting_payment` conta como ocupado enquanto o hold
      -- não expira, igual à restrição de exclusão que impede a sobreposição.
      select b.room_id, b.start_at, b.end_at, 'booked'::text as kind
        from public.bookings b
        join public.rooms r on r.company_id = b.company_id and r.id = b.room_id
       where b.room_id = any(target_room_ids)
         and r.status = 'active'
         and b.status in ('awaiting_payment','confirmed','in_progress')
         and (b.status <> 'awaiting_payment' or b.hold_expires_at > now())
      union all
      -- A janela de limpeza que sucede cada reserva. Sem ela o próximo bloco
      -- seria vendido com a sala ainda suja.
      select b.room_id,
             b.end_at,
             b.end_at + make_interval(mins => r.cleaning_time_minutes),
             'cleaning'::text
        from public.bookings b
        join public.rooms r on r.company_id = b.company_id and r.id = b.room_id
       where b.room_id = any(target_room_ids)
         and r.status = 'active'
         and r.cleaning_time_minutes > 0
         and b.status in ('awaiting_payment','confirmed','in_progress')
         and (b.status <> 'awaiting_payment' or b.hold_expires_at > now())
    ) x
   where tstzrange(x.start_at, x.end_at, '[)')
      && tstzrange(target_from, target_to, '[)')
   order by x.start_at;
$$;

revoke all on function public.room_busy_intervals(uuid[], timestamptz, timestamptz) from public;
grant execute on function public.room_busy_intervals(uuid[], timestamptz, timestamptz)
  to anon, authenticated, service_role;

commit;
