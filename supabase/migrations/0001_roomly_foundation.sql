begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.member_role as enum ('customer','employee','manager','admin','super_admin','cleaning');
create type public.booking_status as enum ('awaiting_payment','confirmed','in_progress','completed','cancelled','expired','refunded');
create type public.payment_status as enum ('pending','approved','rejected','cancelled','refunded','partially_refunded','manual_review');
create type public.access_status as enum ('pending','active','expired','revoked','failed','manual_review');
create type public.job_status as enum ('pending','processing','completed','failed','manual_review');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  email text not null,
  phone text,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'customer',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (company_id, auth_user_id),
  unique (company_id, id)
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  role public.member_role not null default 'customer',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, email),
  unique (auth_user_id)
);

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'customer',
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (role in ('customer','employee','manager','admin'))
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text not null,
  city text not null,
  state char(2) not null,
  zip_code text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id uuid not null,
  name text not null,
  slug text not null,
  description text not null default '',
  capacity integer not null check (capacity > 0),
  hourly_price_cents integer not null check (hourly_price_cents >= 0),
  cleaning_time_minutes integer not null default 20 check (cleaning_time_minutes >= 0),
  minimum_booking_minutes integer not null default 60 check (minimum_booking_minutes > 0),
  maximum_booking_minutes integer not null default 240 check (maximum_booking_minutes >= minimum_booking_minutes),
  access_before_minutes integer not null default 5 check (access_before_minutes >= 0),
  access_after_minutes integer not null default 5 check (access_after_minutes >= 0),
  status text not null default 'active' check (status in ('draft','active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, slug),
  foreign key (company_id, location_id) references public.locations(company_id, id)
);

create table public.room_images (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  room_id uuid not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (company_id, room_id) references public.rooms(company_id, id) on delete cascade
);

create table public.room_features (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text
);

create table public.room_feature_relations (
  company_id uuid not null,
  room_id uuid not null,
  feature_id uuid not null references public.room_features(id) on delete cascade,
  primary key (room_id, feature_id),
  foreign key (company_id, room_id) references public.rooms(company_id, id) on delete cascade
);

create table public.locks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  room_id uuid not null,
  provider text not null default 'ttlock',
  external_lock_id text not null,
  gateway_id text,
  name text not null,
  status text not null default 'offline' check (status in ('online','offline','low_battery','maintenance')),
  battery_level integer check (battery_level between 0 and 100),
  last_online_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (provider, external_lock_id),
  foreign key (company_id, room_id) references public.rooms(company_id, id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  location_id uuid not null,
  room_id uuid not null,
  user_id uuid not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  slot tstzrange generated always as (tstzrange(start_at, end_at, '[)')) stored,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  status public.booking_status not null default 'awaiting_payment',
  hold_expires_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  check (end_at > start_at),
  check (total_cents = subtotal_cents - discount_cents),
  check ((status = 'awaiting_payment' and hold_expires_at is not null) or status <> 'awaiting_payment'),
  unique (company_id, id),
  unique (company_id, idempotency_key),
  foreign key (company_id, location_id) references public.locations(company_id, id),
  foreign key (company_id, room_id) references public.rooms(company_id, id),
  foreign key (company_id, user_id) references public.profiles(company_id, id),
  constraint bookings_no_room_overlap exclude using gist (
    company_id with =,
    room_id with =,
    slot with &&
  ) where (status in ('awaiting_payment','confirmed','in_progress'))
);

create index bookings_room_start_idx on public.bookings(company_id, room_id, start_at);
create index bookings_user_start_idx on public.bookings(company_id, user_id, start_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  booking_id uuid not null,
  provider text not null default 'mercado_pago',
  provider_payment_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'BRL',
  payment_method text not null check (payment_method in ('pix','card')),
  status public.payment_status not null default 'pending',
  idempotency_key text not null,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, idempotency_key),
  unique (provider, provider_payment_id),
  foreign key (company_id, booking_id) references public.bookings(company_id, id)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  payment_id uuid,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id),
  foreign key (company_id, payment_id) references public.payments(company_id, id)
);

create table public.booking_access_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  booking_id uuid not null,
  lock_id uuid not null,
  provider text not null default 'ttlock',
  external_code_id text,
  access_code_ciphertext text,
  access_code_fingerprint text,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status public.access_status not null default 'pending',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  check (valid_until > valid_from),
  unique (company_id, booking_id),
  foreign key (company_id, booking_id) references public.bookings(company_id, id),
  foreign key (company_id, lock_id) references public.locks(company_id, id)
);

create table public.integration_operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  provider text not null,
  operation_kind text not null,
  operation_key text not null,
  entity_type text not null,
  entity_id uuid not null,
  status text not null check (status in ('pending','succeeded','failed','unknown','manual_review')),
  retry_count integer not null default 0,
  last_retry_at timestamptz,
  next_retry_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, operation_key)
);

create table public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  scope text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (company_id, scope, idempotency_key)
);

create table public.request_rate_limits (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1 check (request_count>0),
  primary key (actor_user_id,scope,bucket_start)
);

create table public.durable_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  kind text not null check (kind in ('access.provision','access.reconcile','access.revoke','booking.expire','booking.complete','cleaning.request','notification.send','refund.request')),
  payload_version integer not null default 1,
  payload jsonb not null,
  dedupe_key text not null unique,
  status public.job_status not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index durable_jobs_claim_idx on public.durable_jobs(status, available_at) where status in ('pending','processing');

create table public.cleaning_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  booking_id uuid not null,
  room_id uuid not null,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  status text not null default 'pending' check (status in ('pending','assigned','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, booking_id),
  foreign key (company_id, booking_id) references public.bookings(company_id, id),
  foreign key (company_id, room_id) references public.rooms(company_id, id),
  foreign key (company_id, assigned_to) references public.profiles(company_id, id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  user_id uuid,
  booking_id uuid,
  type text not null,
  channel text not null check (channel in ('email','whatsapp','sms','push')),
  destination text not null,
  subject text,
  content text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (company_id, user_id) references public.profiles(company_id, id),
  foreign key (company_id, booking_id) references public.bookings(company_id, id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  actor_user_id uuid,
  request_id text not null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_trace_idx on public.audit_logs(company_id, request_id, created_at);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.company_members m where m.company_id=target_company_id and m.auth_user_id=auth.uid() and m.status='active');
$$;

create or replace function public.can_manage_company(target_company_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.company_members m where m.company_id=target_company_id and m.auth_user_id=auth.uid() and m.status='active' and m.role in ('manager','admin','super_admin'));
$$;

create or replace function public.can_invite_role(target_company_id uuid,target_role public.member_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.company_members m
    where m.company_id=target_company_id and m.auth_user_id=auth.uid() and m.status='active'
      and (
        target_role in ('customer','employee') and m.role in ('manager','admin','super_admin')
        or target_role='manager' and m.role in ('admin','super_admin')
        or target_role='admin' and m.role='super_admin'
      )
  );
$$;

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
begin
  if not public.is_company_member(target_company_id) then raise exception 'tenant_access_denied'; end if;
  if target_start_at<=now() then raise exception 'booking_must_be_in_future'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=target_user_id
      and p.company_id=target_company_id
      and (p.auth_user_id=auth.uid() or public.can_manage_company(target_company_id))
  ) then raise exception 'profile_access_denied'; end if;
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

create or replace function public.record_pending_payment(
  target_booking_id uuid,
  target_provider_payment_id text,
  target_payment_method text,
  target_idempotency_key text
) returns public.payments
language plpgsql security definer set search_path=public as $$
declare
  selected_booking public.bookings;
  result public.payments;
begin
  select * into selected_booking from public.bookings where id=target_booking_id;
  if not found then raise exception 'booking_not_found'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=selected_booking.user_id
      and p.company_id=selected_booking.company_id
      and (p.auth_user_id=auth.uid() or public.can_manage_company(selected_booking.company_id))
  ) then raise exception 'booking_access_denied'; end if;
  insert into public.payments(company_id,booking_id,provider,provider_payment_id,amount_cents,payment_method,status,idempotency_key)
    values(selected_booking.company_id,selected_booking.id,'mercado_pago',target_provider_payment_id,selected_booking.total_cents,target_payment_method,'pending',target_idempotency_key)
    returning * into result;
  return result;
end;
$$;

revoke all on function public.create_booking_hold(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text) from public;
grant execute on function public.create_booking_hold(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text) to authenticated;
revoke all on function public.record_pending_payment(uuid,text,text,text) from public;
grant execute on function public.record_pending_payment(uuid,text,text,text) to authenticated;

create or replace function public.process_payment_event(
  target_external_event_id text,
  target_provider_payment_id text,
  target_status text,
  target_amount_cents integer,
  target_payload jsonb
) returns text
language plpgsql security definer set search_path=public as $$
declare
  selected_payment public.payments;
  selected_booking public.bookings;
  inserted_event_id uuid;
begin
  select * into selected_payment from public.payments
    where provider='mercado_pago' and provider_payment_id=target_provider_payment_id
    for update;
  if not found then raise exception 'payment_not_found'; end if;
  select * into selected_booking from public.bookings
    where id=selected_payment.booking_id and company_id=selected_payment.company_id
    for update;
  insert into public.payment_events(company_id,payment_id,provider,external_event_id,event_type,payload,signature_valid,processed,processed_at)
    values(selected_payment.company_id,selected_payment.id,'mercado_pago',target_external_event_id,'payment.updated',target_payload,true,true,now())
    on conflict (provider,external_event_id) do nothing
    returning id into inserted_event_id;
  if inserted_event_id is null then return 'duplicate'; end if;
  if target_amount_cents <> selected_payment.amount_cents then
    update public.payments set status='manual_review',updated_at=now() where id=selected_payment.id;
    return 'manual_review';
  end if;
  if target_status='approved' then
    if selected_booking.status='awaiting_payment' and selected_booking.hold_expires_at>now() then
      update public.payments set status='approved',paid_at=now(),updated_at=now() where id=selected_payment.id;
      update public.bookings set status='confirmed',hold_expires_at=null,updated_at=now() where id=selected_booking.id;
      insert into public.durable_jobs(company_id,kind,payload,dedupe_key)
        values
          (selected_booking.company_id,'access.provision',jsonb_build_object('bookingId',selected_booking.id),'access.provision:'||selected_booking.id),
          (selected_booking.company_id,'notification.send',jsonb_build_object('bookingId',selected_booking.id,'template','booking-confirmed'),'notification.confirmed:'||selected_booking.id)
        on conflict (dedupe_key) do nothing;
      insert into public.durable_jobs(company_id,kind,payload,dedupe_key,available_at)
        values(selected_booking.company_id,'booking.complete',jsonb_build_object('bookingId',selected_booking.id),'booking.complete:'||selected_booking.id,selected_booking.end_at)
        on conflict (dedupe_key) do nothing;
      insert into public.durable_jobs(company_id,kind,payload,dedupe_key,available_at)
        select selected_booking.company_id,'access.revoke',jsonb_build_object('bookingId',selected_booking.id),'access.revoke:'||selected_booking.id,
          selected_booking.end_at+(r.access_after_minutes||' minutes')::interval
        from public.rooms r where r.id=selected_booking.room_id and r.company_id=selected_booking.company_id
        on conflict (dedupe_key) do nothing;
      insert into public.audit_logs(company_id,request_id,entity_type,entity_id,action,new_values)
        values(selected_booking.company_id,target_external_event_id,'booking',selected_booking.id,'PAYMENT_APPROVED',jsonb_build_object('paymentId',selected_payment.id));
      return 'booking_confirmed';
    end if;
    update public.payments set status='manual_review',updated_at=now() where id=selected_payment.id;
    return 'manual_review';
  elsif target_status in ('rejected','cancelled') then
    update public.payments set status=target_status::public.payment_status,updated_at=now() where id=selected_payment.id;
    update public.bookings set status='cancelled',cancelled_at=now(),updated_at=now()
      where id=selected_booking.id and status='awaiting_payment';
  elsif target_status='refunded' then
    update public.payments set status='refunded',refunded_at=now(),updated_at=now() where id=selected_payment.id;
    update public.bookings set status='refunded',updated_at=now() where id=selected_booking.id;
  end if;
  return 'payment_updated';
end;
$$;

revoke all on function public.process_payment_event(text,text,text,integer,jsonb) from public;
grant execute on function public.process_payment_event(text,text,text,integer,jsonb) to service_role;

create or replace function public.cancel_booking(target_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path=public as $$
declare selected_booking public.bookings;
begin
  select * into selected_booking from public.bookings where id=target_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=selected_booking.user_id and p.company_id=selected_booking.company_id
      and (p.auth_user_id=auth.uid() or public.can_manage_company(selected_booking.company_id))
  ) then raise exception 'booking_access_denied'; end if;
  if selected_booking.status not in ('awaiting_payment','confirmed') or selected_booking.start_at<=now()
    then raise exception 'booking_cannot_be_cancelled'; end if;
  update public.bookings set status='cancelled',cancelled_at=now(),updated_at=now()
    where id=selected_booking.id returning * into selected_booking;
  insert into public.audit_logs(company_id,actor_user_id,request_id,entity_type,entity_id,action,new_values)
    values(selected_booking.company_id,auth.uid(),'cancel:'||selected_booking.id,'booking',selected_booking.id,'BOOKING_CANCELLED',jsonb_build_object('cancelledAt',selected_booking.cancelled_at));
  insert into public.durable_jobs(company_id,kind,payload,dedupe_key)
    select selected_booking.company_id,'access.revoke',jsonb_build_object('bookingId',selected_booking.id),'access.revoke:'||selected_booking.id
    where exists(select 1 from public.booking_access_codes where booking_id=selected_booking.id and company_id=selected_booking.company_id and status='active')
    on conflict (dedupe_key) do nothing;
  insert into public.durable_jobs(company_id,kind,payload,dedupe_key)
    select selected_booking.company_id,'refund.request',jsonb_build_object('bookingId',selected_booking.id),'refund.request:'||selected_booking.id
    where exists(select 1 from public.payments where booking_id=selected_booking.id and company_id=selected_booking.company_id and status='approved')
    on conflict (dedupe_key) do nothing;
  return selected_booking;
end;
$$;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;

create or replace function public.accept_company_invitation(target_token text,target_name text)
returns public.profiles
language plpgsql security definer set search_path=public as $$
declare
  selected_invitation public.company_invitations;
  result public.profiles;
  current_email text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  current_email := lower(coalesce(auth.jwt()->>'email',''));
  select * into selected_invitation from public.company_invitations
    where token_hash=encode(digest(target_token,'sha256'),'hex')
      and accepted_at is null and expires_at>now()
    for update;
  if not found or lower(selected_invitation.email)<>current_email then raise exception 'invalid_invitation'; end if;
  insert into public.company_members(company_id,auth_user_id,role)
    values(selected_invitation.company_id,auth.uid(),selected_invitation.role)
    on conflict (company_id,auth_user_id) do update set role=excluded.role,status='active';
  insert into public.profiles(company_id,auth_user_id,name,email,role)
    values(selected_invitation.company_id,auth.uid(),target_name,current_email,selected_invitation.role)
    on conflict (company_id,email) do update set auth_user_id=excluded.auth_user_id,name=excluded.name,role=excluded.role,status='active'
    returning * into result;
  update public.company_invitations set accepted_at=now() where id=selected_invitation.id;
  return result;
end;
$$;

revoke all on function public.accept_company_invitation(text,text) from public;
grant execute on function public.accept_company_invitation(text,text) to authenticated;

create or replace function public.claim_durable_jobs(target_limit integer default 10)
returns setof public.durable_jobs
language plpgsql security definer set search_path=public as $$
begin
  return query
  with candidates as (
    select id from public.durable_jobs
    where (status='pending' and available_at<=now())
       or (status='processing' and lease_expires_at<=now())
    order by available_at,created_at
    for update skip locked
    limit greatest(1,least(target_limit,50))
  )
  update public.durable_jobs j
    set status='processing',attempts=j.attempts+1,lease_expires_at=now()+interval '2 minutes',updated_at=now()
  from candidates c where j.id=c.id
  returning j.*;
end;
$$;

create or replace function public.complete_durable_job(target_job_id uuid)
returns void language sql security definer set search_path=public as $$
  update public.durable_jobs set status='completed',lease_expires_at=null,last_error_code=null,updated_at=now()
  where id=target_job_id and status='processing';
$$;

create or replace function public.retry_durable_job(target_job_id uuid,target_error_code text,target_manual_review boolean default false)
returns void language sql security definer set search_path=public as $$
  update public.durable_jobs
  set status=case when target_manual_review or attempts>=8 then 'manual_review'::public.job_status else 'pending'::public.job_status end,
      available_at=case when target_manual_review or attempts>=8 then available_at else now()+(least(3600,power(2,attempts)::integer*15)||' seconds')::interval end,
      lease_expires_at=null,last_error_code=left(target_error_code,120),updated_at=now()
  where id=target_job_id and status='processing';
$$;

revoke all on function public.claim_durable_jobs(integer) from public;
revoke all on function public.complete_durable_job(uuid) from public;
revoke all on function public.retry_durable_job(uuid,text,boolean) from public;
grant execute on function public.claim_durable_jobs(integer) to service_role;
grant execute on function public.complete_durable_job(uuid) to service_role;
grant execute on function public.retry_durable_job(uuid,text,boolean) to service_role;

create or replace function public.consume_rate_limit(target_scope text,target_limit integer,target_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_count integer;
declare current_bucket timestamptz;
begin
  if auth.uid() is null then return false; end if;
  if target_limit<1 or target_window_seconds<1 or target_window_seconds>3600 then raise exception 'invalid_rate_limit'; end if;
  current_bucket := to_timestamp(floor(extract(epoch from now())/target_window_seconds)*target_window_seconds);
  insert into public.request_rate_limits(actor_user_id,scope,bucket_start,request_count)
    values(auth.uid(),left(target_scope,80),current_bucket,1)
    on conflict(actor_user_id,scope,bucket_start) do update set request_count=public.request_rate_limits.request_count+1
    returning request_count into current_count;
  delete from public.request_rate_limits where bucket_start<now()-interval '2 hours';
  return current_count<=target_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text,integer,integer) from public;
grant execute on function public.consume_rate_limit(text,integer,integer) to authenticated;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.profiles enable row level security;
alter table public.company_invitations enable row level security;
alter table public.locations enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.room_feature_relations enable row level security;
alter table public.locks enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.booking_access_codes enable row level security;
alter table public.integration_operations enable row level security;
alter table public.idempotency_records enable row level security;
alter table public.request_rate_limits enable row level security;
alter table public.durable_jobs enable row level security;
alter table public.cleaning_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy companies_member_select on public.companies for select using (public.is_company_member(id));
create policy members_same_company on public.company_members for select using (public.is_company_member(company_id));
create policy profiles_own_or_manager on public.profiles for select using (auth_user_id=auth.uid() or public.can_manage_company(company_id));
create policy invitations_managers on public.company_invitations for all using (public.can_manage_company(company_id)) with check (public.can_invite_role(company_id,role));
create policy locations_public_read on public.locations for select using (status='active' or public.is_company_member(company_id));
create policy rooms_public_read on public.rooms for select using (status='active' or public.is_company_member(company_id));
create policy locations_managers_write on public.locations for all using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy rooms_managers_write on public.rooms for all using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy room_images_public_read on public.room_images for select using (exists(select 1 from public.rooms r where r.id=room_images.room_id and r.company_id=room_images.company_id and r.status='active'));
create policy room_features_public_read on public.room_feature_relations for select using (exists(select 1 from public.rooms r where r.id=room_feature_relations.room_id and r.company_id=room_feature_relations.company_id and r.status='active'));
create policy locks_managers_only on public.locks for all using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy bookings_owner_or_manager on public.bookings for select using (public.can_manage_company(company_id) or exists(select 1 from public.profiles p where p.id=bookings.user_id and p.company_id=bookings.company_id and p.auth_user_id=auth.uid()));
create policy payments_owner_or_manager on public.payments for select using (public.can_manage_company(company_id) or exists(select 1 from public.bookings b join public.profiles p on p.id=b.user_id and p.company_id=b.company_id where b.id=payments.booking_id and b.company_id=payments.company_id and p.auth_user_id=auth.uid()));
create policy access_owner_or_manager on public.booking_access_codes for select using (public.can_manage_company(company_id) or exists(select 1 from public.bookings b join public.profiles p on p.id=b.user_id and p.company_id=b.company_id where b.id=booking_access_codes.booking_id and b.company_id=booking_access_codes.company_id and p.auth_user_id=auth.uid()));
create policy cleaning_company_roles on public.cleaning_requests for select using (public.is_company_member(company_id));
create policy notifications_owner_or_manager on public.notifications for select using (public.can_manage_company(company_id) or exists(select 1 from public.profiles p where p.id=notifications.user_id and p.company_id=notifications.company_id and p.auth_user_id=auth.uid()));
create policy audit_managers_only on public.audit_logs for select using (public.can_manage_company(company_id));

commit;
