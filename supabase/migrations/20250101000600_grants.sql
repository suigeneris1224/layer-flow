-- LayerFlow :: table privileges for the PostgREST roles
--
-- Migrations run as `postgres`, and in Supabase the default privileges for
-- objects created by that role grant only TRUNCATE/REFERENCES/TRIGGER to
-- anon, authenticated and service_role -- no SELECT, INSERT, UPDATE or DELETE.
-- Without this migration every table in this schema is unreachable through the
-- API with "permission denied", regardless of RLS.
--
-- GRANTS AND RLS ARE DIFFERENT THINGS, and both are required:
--
--   GRANT  decides whether a role may touch the table at all.
--   RLS    decides which rows it may touch.
--
-- Granting broad DML to `authenticated` is safe here precisely because RLS is
-- enabled and deny-by-default on every table: reaching the table yields
-- nothing unless a policy admits the row. This is the standard Supabase model.

grant usage on schema public to anon, authenticated, service_role;

-- `authenticated` is every signed-in farmer. RLS constrains them to their farm.
grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

-- service_role additionally has BYPASSRLS, so it is confined to trusted
-- server-side paths only (billing webhooks, jobs). See lib/supabase/admin.ts.
grant select, insert, update, delete
  on all tables in schema public
  to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- `anon` is deliberately granted nothing. No policy targets it, and an
-- unauthenticated visitor has no business reaching farm data even to be
-- refused by RLS.

-- ---------------------------------------------------------------------------
-- Defence in depth: strip privileges that no policy should ever exercise.
--
-- RLS already blocks these (no UPDATE or DELETE policy exists on either table),
-- but revoking at the grant level means a future policy added by mistake still
-- cannot make the audit trail editable or let a farm upgrade its own plan.
-- ---------------------------------------------------------------------------
revoke update, delete on audit_logs from authenticated;
revoke insert, update, delete on subscriptions from authenticated;

-- ---------------------------------------------------------------------------
-- Future tables. Without this, the next migration reintroduces the same bug.
-- Applies to objects created by `postgres`, which is what migrations run as.
-- ---------------------------------------------------------------------------
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
