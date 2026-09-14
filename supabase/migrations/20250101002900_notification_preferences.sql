-- LayerFlow :: notification_preferences
--
-- Per-farm on/off switches for the two broad notification categories shown
-- on Settings -> Notifications. `notifications` itself has no user_id (one
-- shared farm inbox, one read_at cleared for everyone) so this stays
-- per-farm too, same shape as alert_thresholds/farm_defaults -- one row per
-- farm, MANAGER+ writes.
--
-- This does not control WHEN an alert fires (lib/domain/alerts.ts's rules
-- and alert_thresholds already do that) or what the dashboard shows live
-- (lib/data/dashboard.ts's DashboardData.alerts is never filtered by this) --
-- only whether a firing alert is allowed to become/stay a `notifications`
-- row. No row, or true, means "notify" -- the same behavior as today.

create table notification_preferences (
  farm_id                  uuid primary key references farms (id) on delete cascade,
  farm_alerts_enabled      boolean not null default true,
  inventory_alerts_enabled boolean not null default true,
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table notification_preferences enable row level security;

create policy notification_preferences_select on notification_preferences
  for select to authenticated using (app.is_farm_member(farm_id));

create policy notification_preferences_write on notification_preferences
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));
