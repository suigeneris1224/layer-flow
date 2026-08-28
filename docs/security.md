# Security

> **Status: verified.** The model below has been executed against PostgreSQL and exercised by
> `npm run test:rls` — 39 assertions covering cross-farm reads and writes, role boundaries, the
> append-only audit trail, and the `record_daily_production` RPC. RLS is confirmed enabled on all
> 19 tables with 42 policies. Re-run that suite after any schema change.

## Tenant isolation

A **farm** is the tenant. Isolation is enforced by PostgreSQL Row Level Security, at the database.

Middleware redirects and UI checks are convenience. They are not the boundary. If every line of
TypeScript in this project were bypassed, RLS would still refuse to return another farm's rows.

Every farm-owned table:

1. Has `alter table ... enable row level security`
2. Is deny-by-default — no policy means no access
3. Grants access only through a `farm_members` row for `auth.uid()`

### The recursion problem

`farm_members` needs its own RLS policy, but that policy has to read `farm_members` — which would
recurse infinitely.

The fix is a `SECURITY DEFINER` helper in a private `app` schema:

```sql
create function app.is_farm_member(farm uuid) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (
  select 1 from public.farm_members m
  where m.farm_id = farm and m.user_id = auth.uid()
); $$;
```

Definer rights break the cycle. Three things keep this safe:

- It lives in `app`, which PostgREST does not expose, so it is unreachable over the API.
- `search_path` is pinned, so a hostile schema cannot shadow `public.farm_members`.
- It takes a farm id and returns a boolean. It returns no data and grants no access by itself.

## Roles

| Role | Can do |
|---|---|
| **WORKER** | Record daily production, feed, mortality |
| **MANAGER** | The above, plus flocks, houses, sales, expenses, pricing, customers |
| **OWNER** | The above, plus team members, billing, farm settings |

Defined twice on purpose, and the two **must agree**:

- `supabase/migrations/20250101000400_rls.sql` — the enforcement
- `lib/auth/permissions.ts` — so the UI can hide what a user cannot do, and actions can fail with
  a friendly message instead of a raw policy violation

Change one, change the other.

## Never trusted from the client

`farm_id`, `user_id`, `role` and `plan` are **always** derived server-side.

- `farms` insert policy pins `owner_id = auth.uid()`
- `record_daily_production` derives `farm_id` from the flock, and under RLS a flock the caller
  cannot see returns nothing
- The active-farm cookie only *selects among farms the user already belongs to* — a tampered value
  falls through to their default rather than granting access
- Plan limits are counted from the database, never from a submitted number

### A subtle one worth remembering

RLS on `daily_egg_size_production` checks the **parent** production row's farm. It says nothing
about the `egg_size_id` on the child. Without an explicit check, a caller could attach another
farm's egg size to their own record.

`record_daily_production` rejects any egg size not belonging to the resolved farm. Child tables
that inherit tenancy from a parent need this kind of check on every foreign key they carry.

## Service role key

`SUPABASE_SERVICE_ROLE_KEY` **bypasses RLS entirely**.

- Confined to `lib/supabase/admin.ts`
- That file imports `server-only`, so bundling it into client code is a **build error**, not a
  silent leak
- Legitimate uses are narrow: billing webhooks (no user session) and maintenance jobs
- Code using it is responsible for its own tenant checks, because the database no longer does them

Never reach for it to make a failing query work. A query failing under RLS is the policy doing
its job.

## Authentication

Supabase Auth, with the patterns Supabase recommends:

- `getUser()` everywhere, **never** `getSession()` — `getUser()` revalidates the token with
  Supabase; `getSession()` trusts whatever the cookie claims
- Middleware refreshes the session on every request
- Email confirmation is **off locally** (so the seeded demo account works immediately) and
  **must be on in production** — see `supabase/config.toml`

### Open redirects

Both `?next=` handling in `signInAction` and the auth callback accept only same-origin paths:
a value must start with `/` and must not start with `//`. Without that check, a crafted link
could bounce a user to an attacker's site carrying a fresh session.

### Account enumeration

Password reset always returns the same message whether or not the address exists. Failures are
logged for us, never shown. Otherwise the form becomes an oracle for which emails have accounts.

## Audit trail

`audit_logs` is append-only. Managers can read it; **no update or delete policy exists anywhere**,
so the trail cannot be rewritten from the client.

Writes are best-effort: a failed audit insert must never roll back the farmer's actual record.
Failures are logged for us to investigate rather than shown to a user who can do nothing about
them.

## Secrets

- No secret is committed. `.env.local` is gitignored.
- `lib/config/env.ts` splits public from server config, so importing server config from a Client
  Component is a build error rather than a leak.
- Logging redacts known-sensitive keys, including `email` and `phone`.

## Transport and headers

Set in `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` denying camera,
microphone and geolocation. HTTPS is terminated by Vercel.

## Still to do

- [x] ~~Run the migrations.~~ Done — all seven apply cleanly.
- [x] ~~RLS isolation tests.~~ Done — `tests/rls/isolation.test.ts`, 39 passing.
- [ ] **Rate limiting** on auth endpoints and server actions.
- [ ] **A Content-Security-Policy header.** Not yet set.
- [ ] Verify email confirmation is enabled before any real farm signs up.
