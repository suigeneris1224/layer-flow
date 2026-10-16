-- LayerFlow :: biosecurity log
--
-- Two plain logs: who came onto the farm, and the routine checks (footbath,
-- disinfection, pest control, cleaning). Like vaccinations, these are written
-- by whoever is on site -- usually a worker -- so any member may write
-- (app.is_farm_member), and each row records who logged it, same as
-- 20250101003600_health_recorded_by.sql.
--
-- The app reports facts ("this visitor was near other poultry 2 days ago",
-- "no footbath change logged in 9 days"). It makes no disease or veterinary
-- judgement, same stance as lib/domain/alerts.ts.

create type biosecurity_check_type as enum (
  'FOOTBATH', 'DISINFECTION', 'PEST_CONTROL', 'CLEANING', 'OTHER'
);

-- ---------------------------------------------------------------------------
-- biosecurity_visits
-- ---------------------------------------------------------------------------
create table biosecurity_visits (
  id                         uuid primary key default gen_random_uuid(),
  farm_id                    uuid not null references farms (id) on delete cascade,
  visit_date                 date not null,
  visitor_name               text not null check (length(btrim(visitor_name)) > 0),
  purpose                    text,
  vehicle_plate              text,
  -- When the visitor was last around other poultry, if they said. Null =
  -- unknown or none; the app only ever reports the gap, never a verdict.
  last_poultry_contact_date  date,
  disinfected                boolean not null default false,
  notes                      text,
  recorded_by                uuid references auth.users (id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint biosecurity_visits_contact_not_after_visit
    check (last_poultry_contact_date is null or last_poultry_contact_date <= visit_date)
);

create index biosecurity_visits_farm_date_idx on biosecurity_visits (farm_id, visit_date desc);

create trigger biosecurity_visits_touch
  before update on biosecurity_visits
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- biosecurity_checks
-- ---------------------------------------------------------------------------
create table biosecurity_checks (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms (id) on delete cascade,
  -- Optional: a footbath belongs to a house, a perimeter rodent round doesn't.
  house_id     uuid references houses (id) on delete set null,
  check_date   date not null,
  check_type   biosecurity_check_type not null,
  notes        text,
  recorded_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index biosecurity_checks_farm_type_date_idx
  on biosecurity_checks (farm_id, check_type, check_date desc);

create trigger biosecurity_checks_touch
  before update on biosecurity_checks
  for each row execute function app.touch_updated_at();

-- The house must belong to the same farm, mirroring
-- app.assert_flock_farm_matches() for flocks.
create or replace function app.assert_house_farm_matches()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.house_id is not null and not exists (
    select 1 from public.houses h
    where h.id = new.house_id and h.farm_id = new.farm_id
  ) then
    raise exception 'House % does not belong to farm %', new.house_id, new.farm_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger biosecurity_checks_house_farm_guard
  before insert or update of house_id, farm_id on biosecurity_checks
  for each row execute function app.assert_house_farm_matches();

-- ---------------------------------------------------------------------------
-- Alert thresholds: how long without a check before we mention it
-- ---------------------------------------------------------------------------
-- Same sparse-override shape as the other columns (advanced_alerts, Pro).
alter table alert_thresholds
  add column footbath_gap_days integer check (footbath_gap_days is null or footbath_gap_days > 0),
  add column pest_control_gap_days integer
    check (pest_control_gap_days is null or pest_control_gap_days > 0);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table biosecurity_visits enable row level security;
alter table biosecurity_checks enable row level security;

create policy biosecurity_visits_select on biosecurity_visits
  for select to authenticated using (app.is_farm_member(farm_id));
create policy biosecurity_visits_write on biosecurity_visits
  for all to authenticated
  using (app.is_farm_member(farm_id))
  with check (app.is_farm_member(farm_id));

create policy biosecurity_checks_select on biosecurity_checks
  for select to authenticated using (app.is_farm_member(farm_id));
create policy biosecurity_checks_write on biosecurity_checks
  for all to authenticated
  using (app.is_farm_member(farm_id))
  with check (app.is_farm_member(farm_id));
