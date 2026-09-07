-- ---------------------------------------------------------------------------
-- Priority support
-- ---------------------------------------------------------------------------
-- The `priority_support` Feature flag (lib/subscriptions/plans.ts) has sold on
-- Pro since the plan table existed with nothing behind it. This is the real
-- thing: a signed-in support form, and an admin queue that surfaces Pro (and
-- beta-Pro) requests first. `priority` is set once at submission time by the
-- server action from the submitter's plan/beta status -- it is not
-- recalculated later, since a plan change after the fact shouldn't reorder a
-- request already in the queue.
create table support_requests (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms (id) on delete cascade,
  submitted_by uuid not null references auth.users (id) on delete cascade,
  subject      text not null check (length(btrim(subject)) > 0),
  message      text not null check (length(btrim(message)) > 0),
  priority     boolean not null default false,
  status       text not null default 'open' check (status in ('open', 'resolved')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index support_requests_farm_id_idx on support_requests (farm_id);
create index support_requests_status_idx on support_requests (status);

create trigger support_requests_touch
  before update on support_requests
  for each row execute function app.touch_updated_at();

alter table support_requests enable row level security;

-- Any farm member may see and file their own farm's requests -- matches
-- daily_production/feed_usage's "any member" shape, not the owner-only
-- can_manage_farm one, since asking for help isn't a management action.
create policy support_requests_select on support_requests
  for select to authenticated
  using (app.is_farm_member(farm_id));

create policy support_requests_insert on support_requests
  for insert to authenticated
  with check (app.is_farm_member(farm_id) and submitted_by = auth.uid());

-- Status/admin_note changes are admin-only, via the service-role client in
-- app/admin/actions.ts (same shape as beta_testing's writes) -- no client
-- update/delete policy exists, and the default-privileges grant is revoked
-- as defense-in-depth, matching 20250101001900_beta_testing.sql.
revoke update, delete on support_requests from authenticated;
