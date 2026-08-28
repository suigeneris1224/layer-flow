-- LayerFlow :: production domain
-- Egg sizes, egg pricing, daily production + size breakdown, feed, mortality.

create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------------
-- egg_sizes :: per-farm, configurable. Not a hard-coded enum, because farms
-- rename/disable/reorder their own categories.
-- ---------------------------------------------------------------------------
create table egg_sizes (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  code        text not null check (code ~ '^[A-Z0-9_]+$'),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (farm_id, code)
);

create index egg_sizes_farm_id_idx on egg_sizes (farm_id, sort_order);

create trigger egg_sizes_touch
  before update on egg_sizes
  for each row execute function app.touch_updated_at();

-- Seeds the five default categories for a newly created farm.
create or replace function app.seed_default_egg_sizes(farm uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.egg_sizes (farm_id, name, code, sort_order)
  values
    (farm, 'Small',       'SMALL',       1),
    (farm, 'Medium',      'MEDIUM',      2),
    (farm, 'Large',       'LARGE',       3),
    (farm, 'Extra Large', 'EXTRA_LARGE', 4),
    (farm, 'Jumbo',       'JUMBO',       5)
  on conflict (farm_id, code) do nothing;
$$;

grant execute on function app.seed_default_egg_sizes(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- egg_prices :: farm-configured, effective-dated.
--
-- Sales copy the price in force at sale time onto the sale item, so editing
-- this table never rewrites history.
-- ---------------------------------------------------------------------------
create table egg_prices (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null references farms (id) on delete cascade,
  egg_size_id     uuid not null references egg_sizes (id) on delete cascade,
  price_per_egg   numeric(12, 4) not null check (price_per_egg >= 0),
  price_per_tray  numeric(12, 4) not null check (price_per_tray >= 0),
  effective_from  date not null default current_date,
  effective_to    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint egg_prices_range_valid
    check (effective_to is null or effective_to >= effective_from),
  -- One price per size per day. Overlapping effective ranges are a data bug.
  constraint egg_prices_no_overlap exclude using gist (
    farm_id with =,
    egg_size_id with =,
    daterange(effective_from, effective_to, '[]') with &&
  )
);

create index egg_prices_lookup_idx on egg_prices (farm_id, egg_size_id, effective_from desc);

create trigger egg_prices_touch
  before update on egg_prices
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- daily_production :: the core daily record. One per flock per day.
-- ---------------------------------------------------------------------------
create table daily_production (
  id                   uuid primary key default gen_random_uuid(),
  farm_id              uuid not null references farms (id) on delete cascade,
  flock_id             uuid not null references flocks (id) on delete cascade,
  production_date      date not null,
  hens_present         integer not null check (hens_present >= 0),
  eggs_collected       integer not null default 0 check (eggs_collected >= 0),
  broken_eggs          integer not null default 0 check (broken_eggs >= 0),
  dirty_eggs           integer not null default 0 check (dirty_eggs >= 0),
  average_egg_weight   numeric(6, 2) check (average_egg_weight is null or average_egg_weight > 0),
  mortality            integer not null default 0 check (mortality >= 0),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (flock_id, production_date),
  constraint daily_production_damaged_within_collected
    check (broken_eggs + dirty_eggs <= eggs_collected)
);

create index daily_production_farm_date_idx on daily_production (farm_id, production_date desc);
create index daily_production_flock_date_idx on daily_production (flock_id, production_date desc);

create trigger daily_production_touch
  before update on daily_production
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- daily_egg_size_production :: the size breakdown of one day's collection.
-- ---------------------------------------------------------------------------
create table daily_egg_size_production (
  id                   uuid primary key default gen_random_uuid(),
  daily_production_id  uuid not null references daily_production (id) on delete cascade,
  egg_size_id          uuid not null references egg_sizes (id) on delete restrict,
  quantity             integer not null default 0 check (quantity >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (daily_production_id, egg_size_id)
);

create index daily_egg_size_production_parent_idx
  on daily_egg_size_production (daily_production_id);
create index daily_egg_size_production_size_idx
  on daily_egg_size_production (egg_size_id);

create trigger daily_egg_size_production_touch
  before update on daily_egg_size_production
  for each row execute function app.touch_updated_at();

-- The size breakdown may never claim more eggs than were actually collected.
-- Validated in the app for a friendly message; enforced here so it is true
-- regardless of which client wrote the row.
create or replace function app.assert_egg_size_total_within_collected()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_id uuid;
  breakdown_total integer;
  collected integer;
begin
  -- NEW is unassigned on DELETE in a row-level trigger, so reading a field of
  -- it raises 'record "new" is not assigned yet'. Branch on TG_OP instead.
  if tg_op = 'DELETE' then
    parent_id := old.daily_production_id;
  else
    parent_id := new.daily_production_id;
  end if;

  select eggs_collected into collected
  from public.daily_production
  where id = parent_id;

  -- Parent already removed by a cascading delete: nothing left to validate.
  if collected is null then
    return null;
  end if;

  select coalesce(sum(quantity), 0) into breakdown_total
  from public.daily_egg_size_production
  where daily_production_id = parent_id;

  if breakdown_total > collected then
    raise exception
      'Egg size breakdown (%) exceeds eggs collected (%)', breakdown_total, collected
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

-- Deferred to commit so a multi-row rewrite is judged on its end state rather
-- than row by row: a non-deferred trigger would reject a valid reshuffle midway
-- through, before the compensating rows had been written.
create constraint trigger daily_egg_size_total_guard
  after insert or update or delete on daily_egg_size_production
  deferrable initially deferred
  for each row execute function app.assert_egg_size_total_within_collected();

-- Lowering eggs_collected must not strand an oversized breakdown.
create or replace function app.assert_collected_covers_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  breakdown_total integer;
begin
  select coalesce(sum(quantity), 0) into breakdown_total
  from public.daily_egg_size_production
  where daily_production_id = new.id;

  if breakdown_total > new.eggs_collected then
    raise exception
      'Egg size breakdown (%) exceeds eggs collected (%)', breakdown_total, new.eggs_collected
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger daily_production_collected_guard
  after update on daily_production
  deferrable initially deferred
  for each row execute function app.assert_collected_covers_breakdown();

-- ---------------------------------------------------------------------------
-- feed_usage
-- ---------------------------------------------------------------------------
create table feed_usage (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms (id) on delete cascade,
  flock_id     uuid not null references flocks (id) on delete cascade,
  usage_date   date not null,
  quantity_kg  numeric(12, 3) not null check (quantity_kg >= 0),
  cost_per_kg  numeric(12, 4) not null default 0 check (cost_per_kg >= 0),
  -- Stored rather than computed so a corrected unit cost never silently
  -- restates what the farmer already recorded as spent.
  total_cost   numeric(14, 2) not null default 0 check (total_cost >= 0),
  feed_type    text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index feed_usage_farm_date_idx on feed_usage (farm_id, usage_date desc);
create index feed_usage_flock_date_idx on feed_usage (flock_id, usage_date desc);

create trigger feed_usage_touch
  before update on feed_usage
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- mortality_records :: the single source of truth for hen losses.
--
-- The daily production form writes one linked row here (daily_production_id
-- set); ad-hoc incidents are recorded with it null. Reports sum this table
-- only, so nothing is ever double-counted.
-- ---------------------------------------------------------------------------
create table mortality_records (
  id                   uuid primary key default gen_random_uuid(),
  farm_id              uuid not null references farms (id) on delete cascade,
  flock_id             uuid not null references flocks (id) on delete cascade,
  daily_production_id  uuid references daily_production (id) on delete cascade,
  record_date          date not null,
  quantity             integer not null check (quantity > 0),
  reason               text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- At most one auto-generated row per production record.
  unique (daily_production_id)
);

create index mortality_records_farm_date_idx on mortality_records (farm_id, record_date desc);
create index mortality_records_flock_date_idx on mortality_records (flock_id, record_date desc);

create trigger mortality_records_touch
  before update on mortality_records
  for each row execute function app.touch_updated_at();

-- current_hens is derived, never hand-edited, so it cannot drift from the
-- mortality ledger.
create or replace function app.recalc_flock_hens()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid := coalesce(new.flock_id, old.flock_id);
begin
  update public.flocks f
  set current_hens = greatest(
    f.initial_hens - coalesce((
      select sum(m.quantity)
      from public.mortality_records m
      where m.flock_id = target
    ), 0),
    0
  )
  where f.id = target;
  return null;
end;
$$;

create trigger mortality_recalc_hens
  after insert or update or delete on mortality_records
  for each row execute function app.recalc_flock_hens();

-- ---------------------------------------------------------------------------
-- vaccinations
-- ---------------------------------------------------------------------------
create table vaccinations (
  id                 uuid primary key default gen_random_uuid(),
  farm_id            uuid not null references farms (id) on delete cascade,
  flock_id           uuid not null references flocks (id) on delete cascade,
  vaccination_date   date not null,
  vaccine_name       text not null check (length(btrim(vaccine_name)) > 0),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index vaccinations_flock_date_idx on vaccinations (flock_id, vaccination_date desc);

create trigger vaccinations_touch
  before update on vaccinations
  for each row execute function app.touch_updated_at();
