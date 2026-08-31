# Architecture

A modular monolith on Next.js and Supabase. One deployable, clear internal seams, no
microservices — a solo developer has to be able to hold it in their head.

## Layers

```
app/            Routes, Server Components, Server Actions
components/     Presentation only. No business logic, no data access.
lib/domain/     Pure functions: calculations, alert rules
lib/data/       Query + service layer. The only place Supabase is queried.
lib/auth/       Session, farm context, role permissions
lib/subscriptions/  Plans, limits, entitlements
lib/validation/ Zod schemas shared by client and server
lib/supabase/   Client construction (browser / server / admin)
```

The rule that matters: **dependencies point inward.** `lib/domain` imports nothing from the
project. It is pure, so it is cheap to test — which is why 97 tests run in under two seconds
without a database.

## Request flow

A page render:

```
Request
  → middleware.ts          refresh session cookie, bounce anonymous users
  → app/(app)/layout.tsx   requireFarmContext() — redirects to onboarding if no farm
  → page.tsx               Server Component
  → lib/data/*             parallel Supabase queries, RLS applied
  → lib/domain/*           derive the numbers
  → components/*           render
```

A mutation:

```
Client form
  → Zod validation (courtesy — saves a round trip)
  → Server Action
      → requireUser()          authenticated?
      → getFarmContext()       member of a farm?
      → can*() permission      role allows it?
      → assertCanCreate()      plan allows it?
      → Zod validation         the check that counts
      → lib/data / RPC         write, RLS applied
      → recordAuditLog()       best-effort trail
      → revalidatePath()
```

Every one of those gates runs on the server. Client-side checks exist so a farmer is not shown a
button that will reject them — they are not the control.

Two of these gates are not farm-scoped. The profile actions in `app/(app)/settings/actions.ts`
skip `getFarmContext()` and the role check entirely: a profile belongs to a person, not a farm,
and the id always comes from the verified session rather than the client. `profiles_update_self`
enforces the same rule in the database.

Plan limits apply to reads as well as writes. `historyCutoffDate()` in
`lib/subscriptions/entitlements.ts` turns the `history_days` limit into a date, and `/production`
passes it as the `since` bound on both the list and its count — the first place in the codebase
that limit has ever been enforced. The upgrade prompt renders only when records actually exist
before the cutoff, so a farm younger than the window is never told it is missing something.

## Server Components by default

Components are server-rendered unless they need interactivity. `"use client"` appears only where
there is state, an event handler, or a browser API. This keeps JavaScript off the wire, which
matters on a rural mobile connection.

Where a Client Component is unavoidable, it receives plain serialisable props rather than
fetching for itself. There are no client-side data waterfalls.

## Data access

All Supabase queries live in `lib/data/`. Components never build queries.

Reads that feed one screen are issued together with `Promise.all` rather than in sequence. On a
slow connection, six serial round trips is the difference between a dashboard that feels instant
and one that feels broken.

There are three Supabase clients:

| Client | Key | RLS | Use |
|---|---|---|---|
| `lib/supabase/server.ts` | anon | ✅ enforced | Almost everything |
| `lib/supabase/client.ts` | anon | ✅ enforced | Browser interactivity |
| `lib/supabase/admin.ts` | **service role** | ❌ **bypassed** | Webhooks, jobs only |

If a query fails under RLS, that is the policy working. Fix the access path, not the client.

## Transactions

`supabase-js` cannot span statements, so any write touching several tables lives in a SQL
function. `record_daily_production` writes `daily_production`, the egg-size breakdown,
`feed_usage` and `mortality_records` in one transaction.

It is `SECURITY INVOKER` on purpose: it exists for atomicity, not privilege. Every statement
inside still runs under the caller's RLS policies.

It also **upserts** on `(flock_id, production_date)`. That prevents duplicate day records and
makes the call idempotent — which is what will let the offline queue retry safely without
creating a second day.

## Money

Money is `NUMERIC(14,2)` in Postgres and never a float. In TypeScript, `roundMoney()` rounds
through integer centavos at every boundary so repeated arithmetic cannot drift.

Profit is always labelled **"Estimated Operating Profit"**. It excludes depreciation, owner's
draw and financing, so presenting it as net income would be wrong — and misleading to a farmer
making decisions on it.

## Time

Farms are in `Asia/Manila`; servers are in UTC. `farmToday()` resolves "today" in the farm's
timezone, because a farmer recording at 7am in Cebu is at 23:00 UTC the previous day. Using the
server's date would file the morning collection under yesterday.

Date arithmetic goes through `shiftDate()`, which works in UTC. Building a `Date` from a
local-midnight string and calling `.toISOString()` shifts the day backwards for any timezone
ahead of UTC — a bug this codebase actually shipped and a test caught.

## Errors

Raw database errors never reach the browser. `lib/errors.ts` maps constraint names and error codes
to sentences a farmer can act on:

> `duplicate key value violates unique constraint "daily_production_flock_id_production_date_key"`

becomes

> "This flock already has a production record for this date. Open that record to edit it."

The original is logged in full for us.

## Observability

`lib/observability/logger.ts` is deliberately vendor-neutral: structured JSON lines in production
(which Vercel log drains parse directly), readable output in development. Known-sensitive keys are
redacted. Pointing `reportError` at Sentry or similar is a one-function change.
