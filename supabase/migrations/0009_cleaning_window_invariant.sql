-- O preparo da sala vira invariante, não só informação da grade.
--
-- `room_busy_intervals` já publica os minutos seguintes a cada reserva como
-- ocupados, e a tela nunca oferece esse bloco. Mas a restrição de exclusão
-- compara só `[start_at, end_at)`, e `create_booking_hold` é executável direto
-- pelo PostgREST por qualquer pessoa autenticada. Quem chamasse a função sem
-- passar pela tela comprava a sala ainda suja, e a limpeza da reserva anterior
-- era acionada com a próxima já em curso.
--
-- A regra estava escrita em dois lugares que discordavam. Agora o banco recusa
-- o que a grade já não oferecia.

begin;

create or replace function public.create_booking_hold(
  target_company_id uuid,
  target_location_id uuid,
  target_room_id uuid,
  target_user_id uuid,
  target_start_at timestamptz,
  target_end_at timestamptz,
  target_idempotency_key text
) returns public.bookings
language plpgsql security definer set search_path=public as $$
declare
  result public.bookings;
  selected_room public.rooms;
  duration_minutes numeric;
  computed_subtotal integer;
  preparo interval;
begin
  if target_start_at<=now() then raise exception 'booking_must_be_in_future'; end if;
  if not exists(
    select 1 from public.customers c
    where c.id=target_user_id
      and c.status='active'
      and (c.auth_user_id=auth.uid() or public.can_manage_company(target_company_id))
  ) then raise exception 'customer_access_denied'; end if;
  select * into selected_room from public.rooms
    where id=target_room_id and company_id=target_company_id and location_id=target_location_id and status='active';
  if not found then raise exception 'room_not_found'; end if;
  duration_minutes := extract(epoch from (target_end_at-target_start_at))/60;
  if duration_minutes < selected_room.minimum_booking_minutes
     or duration_minutes > selected_room.maximum_booking_minutes
     or target_end_at <= target_start_at
  then raise exception 'invalid_booking_duration'; end if;
  computed_subtotal := round((duration_minutes/60)*selected_room.hourly_price_cents);
  update public.bookings set status='expired', updated_at=now()
    where company_id=target_company_id and room_id=target_room_id and status='awaiting_payment' and hold_expires_at<=now();

  -- Cada reserva ocupa o próprio horário mais o preparo que vem depois. Duas
  -- reservas colidem quando esses intervalos estendidos se cruzam, o que cobre
  -- os dois lados: encostar no fim da anterior e encostar no início da próxima.
  -- Mesmo conjunto de status e mesma guarda de hold que `room_busy_intervals`,
  -- senão as duas leituras voltariam a discordar.
  preparo := make_interval(mins => selected_room.cleaning_time_minutes);
  if selected_room.cleaning_time_minutes > 0 and exists(
    select 1 from public.bookings b
    where b.company_id=target_company_id
      and b.room_id=target_room_id
      and b.status in ('awaiting_payment','confirmed','in_progress')
      and (b.status <> 'awaiting_payment' or b.hold_expires_at > now())
      and tstzrange(b.start_at, b.end_at + preparo, '[)')
       && tstzrange(target_start_at, target_end_at + preparo, '[)')
  ) then raise exception 'room_unavailable_during_cleaning'; end if;

  insert into public.bookings(company_id,location_id,room_id,user_id,start_at,end_at,subtotal_cents,discount_cents,total_cents,status,hold_expires_at,idempotency_key)
    values(target_company_id,target_location_id,target_room_id,target_user_id,target_start_at,target_end_at,computed_subtotal,0,computed_subtotal,'awaiting_payment',now()+interval '10 minutes',target_idempotency_key)
    returning * into result;
  insert into public.durable_jobs(company_id,kind,payload,dedupe_key,available_at)
    values(result.company_id,'booking.expire',jsonb_build_object('bookingId',result.id),'booking.expire:'||result.id,result.hold_expires_at)
    on conflict (dedupe_key) do nothing;
  insert into public.audit_logs(company_id,actor_user_id,request_id,entity_type,entity_id,action,new_values)
    values(result.company_id,auth.uid(),target_idempotency_key,'booking',result.id,'BOOKING_HOLD_CREATED',jsonb_build_object('startAt',result.start_at,'endAt',result.end_at,'totalCents',result.total_cents));
  return result;
end;
$$;

commit;
