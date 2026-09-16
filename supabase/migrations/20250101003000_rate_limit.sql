-- LayerFlow :: app-level rate limiting
--
-- Backs lib/data/rate-limit.ts. Every hit-counting request in this app
-- (login, signup, password reset, invite) is either pre-session (no RLS to
-- key off of, same class of problem app/auth/actions.ts's beta gate already
-- solves) or needs a cap scoped to the farm rather than the acting member --
-- so this is written and read exclusively by createSupabaseAdminClient(),
-- same posture as email_events (20250101002700_email_events.sql).
create table rate_limit_hits (
  id          uuid primary key default gen_random_uuid(),
  -- A normalized email, or a farm id for the already-authenticated
  -- (invite) case. Never an IP -- nothing in this app reads request headers
  -- for one today.
  identifier  text not null,
  -- 'login' | 'signup' | 'password_reset' | 'invite' -- see
  -- lib/domain/rate-limit.ts's RATE_LIMITS for the current set and their
  -- windows/thresholds.
  action      text not null,
  created_at  timestamptz not null default now()
);

-- (identifier, action) is the lookup key for every check; created_at DESC
-- lets the "hits in the last N seconds" query stop early.
create index rate_limit_hits_lookup_idx on rate_limit_hits (identifier, action, created_at desc);

alter table rate_limit_hits enable row level security;

-- No policy for `authenticated` at all -- defense-in-depth against
-- 20250101000600_grants.sql's default-privileges rule, which auto-grants full
-- CRUD to `authenticated` on every new table.
revoke insert, update, delete, select on rate_limit_hits from authenticated;
