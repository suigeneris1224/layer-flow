-- LayerFlow :: alert_thresholds
--
-- Per-farm overrides of lib/domain/alerts.ts's THRESHOLDS const, for the
-- advanced_alerts (Pro) feature. One row per farm, not one row per threshold
-- key: the threshold set is small, fixed and typed, so a sparse override row
-- with nullable columns keeps every check constraint numeric instead of
-- flattening into a stringly-typed key/value table.
--
-- No row, or a null column, means "use the default from THRESHOLDS." A farm
-- that downgrades from Pro keeps its row -- lib/domain/alerts.ts's
-- resolveThresholds() ignores it when the farm is no longer entitled, the
-- same "downgrading narrows, never deletes" rule entitlements.ts already
-- applies to history_days.

create table alert_thresholds (
  farm_id              uuid primary key references farms (id) on delete cascade,
  production_drop      numeric,
  feed_cost_rise       numeric,
  daily_mortality_rate numeric,
  egg_size_shift       numeric,
  vaccination_gap_days integer,
  low_inventory_trays  integer,
  stale_pricing_days   integer,
  underperformance_pct numeric,
  loss_threshold_pesos numeric,
  updated_at           timestamptz not null default now(),
  check (production_drop is null or production_drop > 0),
  check (feed_cost_rise is null or feed_cost_rise > 0),
  check (daily_mortality_rate is null or daily_mortality_rate > 0),
  check (egg_size_shift is null or egg_size_shift > 0),
  check (vaccination_gap_days is null or vaccination_gap_days > 0),
  check (low_inventory_trays is null or low_inventory_trays >= 0),
  check (stale_pricing_days is null or stale_pricing_days > 0),
  check (underperformance_pct is null or underperformance_pct > 0),
  check (loss_threshold_pesos is null or loss_threshold_pesos >= 0)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table alert_thresholds enable row level security;

-- A settings/config concern, like egg_prices: any member reads, MANAGER+
-- writes. Plan-gating (advanced_alerts) happens in the app layer, not RLS --
-- RLS enforces tenant isolation and role only, matching the rest of the
-- schema's separation between "who" and "which plan."
create policy alert_thresholds_select on alert_thresholds
  for select to authenticated using (app.is_farm_member(farm_id));

create policy alert_thresholds_write on alert_thresholds
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));
