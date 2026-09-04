-- ---------------------------------------------------------------------------
-- Beta testing phase
-- ---------------------------------------------------------------------------
-- audit_logs.farm_id widened to nullable: platform-level admin events (beta
-- toggle, tester add/remove) have no farm to attach to. ON DELETE CASCADE is
-- a no-op for null values, so no behavior change for any existing row.
alter table audit_logs alter column farm_id drop not null;

-- Singleton toggle -- the standard Postgres "exactly one row" trick.
create table beta_settings (
  id         boolean primary key default true,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint beta_settings_singleton check (id)
);
insert into beta_settings (id, enabled) values (true, false);

create trigger beta_settings_touch
  before update on beta_settings
  for each row execute function app.touch_updated_at();

-- Up to 5 testers, by email -- lib/auth/admin.ts's isPlatformAdmin allowlist
-- is the same shape, and no email->id resolution is ever needed: the
-- getFarmContext() override and the closed-beta signup gate both compare
-- against the signed-in/submitted email directly. App-level check enforces
-- the cap of 5, not a DB constraint -- single-admin-actor writes, no
-- concurrency concern.
create table beta_testers (
  email     text primary key,
  added_by  uuid references auth.users (id) on delete set null,
  added_at  timestamptz not null default now()
);

alter table beta_settings enable row level security;
alter table beta_testers enable row level security;

-- Knowing beta mode exists is not sensitive.
create policy "beta_settings_select_all"
  on beta_settings for select
  to authenticated
  using (true);

-- A signed-in user may see only their OWN row, not the whole tester list --
-- otherwise any authenticated user could see every other beta tester's email.
create policy "beta_testers_select_self"
  on beta_testers for select
  to authenticated
  using (email = auth.email());

-- Writes are admin-only via the service-role client (app/admin/actions.ts).
-- Defense-in-depth against 20250101000600_grants.sql's default-privileges
-- rule, which auto-grants full CRUD to `authenticated` on every new table.
revoke insert, update, delete on beta_settings from authenticated;
revoke insert, update, delete on beta_testers from authenticated;
