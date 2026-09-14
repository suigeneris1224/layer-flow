-- LayerFlow :: farm_defaults
--
-- Per-farm defaults pre-filled into the "add a house" / "add a flock" forms:
-- default house capacity, default flock breed. One row per farm, sparse
-- nullable columns, same shape as alert_thresholds -- the set is small,
-- fixed and typed.
--
-- Unlike alert_thresholds there is no in-code fallback constant: a "10%
-- production drop" default is a reasonable universal choice, but there is no
-- equivalent universal default house capacity or flock breed. No row, or a
-- null column, just means the add-house/add-flock form starts blank, exactly
-- as it does today.

create table farm_defaults (
  farm_id                uuid primary key references farms (id) on delete cascade,
  default_house_capacity integer,
  default_flock_breed    text,
  updated_at             timestamptz not null default now(),
  check (default_house_capacity is null or default_house_capacity > 0),
  check (default_flock_breed is null or length(trim(default_flock_breed)) > 0)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table farm_defaults enable row level security;

-- A settings/config concern, like alert_thresholds: any member reads,
-- MANAGER+ writes -- the same threshold that can add the houses/flocks these
-- defaults pre-fill.
create policy farm_defaults_select on farm_defaults
  for select to authenticated using (app.is_farm_member(farm_id));

create policy farm_defaults_write on farm_defaults
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));
