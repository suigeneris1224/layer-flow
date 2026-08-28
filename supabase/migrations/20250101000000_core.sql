-- LayerFlow :: core tenancy schema
-- Profiles, farms, farm membership, houses, flocks + shared helpers.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper schema. Authorization helpers live here so they can be SECURITY
-- DEFINER (bypassing RLS) without being reachable from PostgREST.
-- ---------------------------------------------------------------------------
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- Generic updated_at trigger.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type farm_role as enum ('OWNER', 'MANAGER', 'WORKER');
create type flock_status as enum ('GROWING', 'PRODUCING', 'SOLD', 'CLOSED');

-- ---------------------------------------------------------------------------
-- profiles :: 1-1 with auth.users
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch
  before update on profiles
  for each row execute function app.touch_updated_at();

-- Auto-provision a profile row whenever a user signs up.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- farms :: the tenant boundary
-- ---------------------------------------------------------------------------
create table farms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) > 0),
  location      text,
  barangay      text,
  municipality  text not null default '',
  province      text not null default '',
  country       text not null default 'Philippines',
  timezone      text not null default 'Asia/Manila',
  currency      text not null default 'PHP',
  owner_id      uuid not null references auth.users (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index farms_owner_id_idx on farms (owner_id);

create trigger farms_touch
  before update on farms
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- farm_members :: which users may see which farm
-- ---------------------------------------------------------------------------
create table farm_members (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        farm_role not null default 'WORKER',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (farm_id, user_id)
);

create index farm_members_user_id_idx on farm_members (user_id);
create index farm_members_farm_id_idx on farm_members (farm_id);

create trigger farm_members_touch
  before update on farm_members
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Authorization helpers.
--
-- These are SECURITY DEFINER on purpose: farm_members' own RLS policy needs to
-- read farm_members, which would recurse infinitely if the read went through
-- RLS. Definer rights break that cycle.
-- ---------------------------------------------------------------------------
create or replace function app.farm_role(farm uuid)
returns farm_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.farm_members m
  where m.farm_id = farm
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function app.is_farm_member(farm uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.farm_members m
    where m.farm_id = farm
      and m.user_id = auth.uid()
  );
$$;

-- Membership with at least the given roles. Pass the roles that may write.
create or replace function app.has_farm_role(farm uuid, variadic roles farm_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.farm_members m
    where m.farm_id = farm
      and m.user_id = auth.uid()
      and m.role = any(roles)
  );
$$;

-- Every farm the caller belongs to. Used by list screens.
create or replace function app.my_farm_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.farm_id from public.farm_members m where m.user_id = auth.uid();
$$;

grant execute on function
  app.farm_role(uuid),
  app.is_farm_member(uuid),
  app.has_farm_role(uuid, farm_role[]),
  app.my_farm_ids()
to authenticated;

-- ---------------------------------------------------------------------------
-- houses
-- ---------------------------------------------------------------------------
create table houses (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  capacity    integer not null check (capacity > 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (farm_id, name)
);

create index houses_farm_id_idx on houses (farm_id);

create trigger houses_touch
  before update on houses
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- flocks
-- ---------------------------------------------------------------------------
create table flocks (
  id                 uuid primary key default gen_random_uuid(),
  farm_id            uuid not null references farms (id) on delete cascade,
  house_id           uuid not null references houses (id) on delete restrict,
  name               text not null check (length(btrim(name)) > 0),
  breed              text not null default '',
  initial_hens       integer not null check (initial_hens > 0),
  current_hens       integer not null check (current_hens >= 0),
  placement_date     date not null,
  start_laying_date  date,
  status             flock_status not null default 'GROWING',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint flocks_current_hens_within_initial check (current_hens <= initial_hens),
  constraint flocks_laying_after_placement
    check (start_laying_date is null or start_laying_date >= placement_date)
);

create index flocks_farm_id_idx on flocks (farm_id);
create index flocks_house_id_idx on flocks (house_id);
create index flocks_farm_status_idx on flocks (farm_id, status);

create trigger flocks_touch
  before update on flocks
  for each row execute function app.touch_updated_at();

-- A flock's house must belong to the same farm as the flock.
create or replace function app.assert_flock_house_same_farm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.houses h
    where h.id = new.house_id and h.farm_id = new.farm_id
  ) then
    raise exception 'House % does not belong to farm %', new.house_id, new.farm_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger flocks_house_farm_guard
  before insert or update of house_id, farm_id on flocks
  for each row execute function app.assert_flock_house_same_farm();
