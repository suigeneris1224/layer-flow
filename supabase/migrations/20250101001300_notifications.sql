-- LayerFlow :: notifications
--
-- The topbar bell used to be a link to the dashboard's own alert computation
-- (lib/domain/alerts.ts) with no memory of its own -- no persistence, no
-- read state, recomputed from scratch on every render. This table gives that
-- same set of deterministic rules a real, farm-shared inbox: one open row per
-- (farm, alert type), closed when the condition stops firing.
--
-- Read state is farm-wide, not per-teammate: one `read_at` column, not a join
-- table. Any member opening the panel clears it for the whole farm, matching
-- how the alert badge already had no notion of "per user."

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms (id) on delete cascade,
  -- Matches lib/domain/alerts.ts's AlertType. Not an enum: new alert types
  -- are additive and a text column needs no migration to gain one.
  type        text not null check (length(btrim(type)) > 0),
  level       text not null check (level in ('warn', 'bad')),
  message     text not null check (length(btrim(message)) > 0),
  read_at     timestamptz,
  -- Null while the underlying alert is still firing.
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- One open notification per farm per alert type. lib/data/notifications.ts's
-- syncNotifications() reads-then-writes rather than relying on ON CONFLICT
-- against this partial index (PostgREST upsert cannot target a partial
-- unique index), but the index still stands as the database-level guarantee
-- against a duplicate slipping through a race.
create unique index notifications_open_key
  on notifications (farm_id, type)
  where resolved_at is null;

create index notifications_farm_idx on notifications (farm_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table notifications enable row level security;

-- Any farm member may read and acknowledge notifications -- this mirrors
-- daily_production_write's shape (any member, not just OWNER/MANAGER), since
-- alerts are operational rather than a commerce or settings concern. Writes
-- happen from the authenticated user's own session (no service-role or
-- SECURITY DEFINER path needed): the acting user is already a farm member,
-- so ordinary RLS is sufficient authorisation.
create policy notifications_select on notifications
  for select to authenticated using (app.is_farm_member(farm_id));

create policy notifications_write on notifications
  for all to authenticated
  using (app.is_farm_member(farm_id))
  with check (app.is_farm_member(farm_id));
