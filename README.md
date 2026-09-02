# LayerFlow

**Know your flock. Know your numbers.**

Mobile-first egg farm management for Philippine layer farmers. Record the morning collection in
under 30 seconds and see what the flock actually earned.

Built for farms of 100–5,000 hens, starting in Cebu. Peso, Asia/Manila, and a phone in a poultry
house are the defaults, not an afterthought.

---

## Current status

A **completed and verified first vertical slice**, not a finished product.

| Check | Status |
|---|---|
| `npm run typecheck` | ✅ passes |
| `npm run lint` | ✅ passes |
| `npm test` | ✅ 163 unit tests |
| `npm run test:rls` | ✅ 47 isolation tests **against a real database** |
| `npm run build` | ✅ compiles, 11 routes |

Verified end to end against local Supabase: all seven migrations apply cleanly, the seed loads,
RLS is enabled on all 19 tables with 42 policies, tenant isolation holds, and the app renders and
writes real data — sign in, view the dashboard, record a production day, watch inventory and
profit update.

### What is built

Onboarding → farm → house → flock → egg sizes → prices → dashboard → daily production →
egg-size breakdown → calculations. Plus auth, the pricing page, and PWA installability.

**Egg inventory**: per-size balances (produced / sold / adjusted / available), trays counted per
size, stock adjustments with reasons, and ungraded-egg reporting.

**Dashboard**: KPI row with period-over-period deltas, production/egg-size/sales charts, recent
activity from the audit trail, inventory and flock panels — on a grouped sidebar shell with a top
bar. Design rules live in [docs/design-system.md](docs/design-system.md) and apply to every screen.

**Egg pricing** (at `/prices` — `/pricing` is the public plans page): current price per size,
effective-dated changes applied atomically, scheduled changes, and price history. Past sales keep
the price used on the day.

**Sales and customers**: sales history with pagination, new sale with stock warnings, inline
customer creation, part-payments and outstanding totals, plus full customer CRUD.

**Expenses**: paginated list, new expense against an optional flock, and a category breakdown
with a chart.

**Analytics and reports** (at `/analytics` and `/reports`): laying rate, egg-size distribution,
mortality and feed statistics, and revenue / cost / profit over a selectable range.

**Production history** (at `/production`): every recorded day, filterable by flock, with a
per-day detail view at `/production/[id]` and editing through the same form that created it.
The FREE plan's 30-day `history_days` limit is enforced here.

**Flock health** (at `/health`): mortality, feed and vaccinations recorded outside a collection
day. These are the ad-hoc rows — the ones a daily production entry owns are edited on that day,
because saving a day rewrites them. Flock hen counts are derived from the mortality ledger by a
trigger and are never written by hand.

**Flock detail** (at `/flocks/[id]`): lifetime eggs, feed and losses, age and survival, plus
recent production, mortality, feed and vaccination records.

**Team** (at `/team`, Pro): invite people to a farm with a shareable link, set and change their
role, and remove them. Invitations are links rather than emails — the owner sends them by
Messenger, SMS or in person — and a `farm_invitations` row becomes a `farm_members` row only when
the invitee opens the link and signs in. Pending invitations count against the plan's user cap.

**Settings** (at `/settings`): name, phone and avatar for the signed-in user, with links out to
farm settings and plans.

### What is not built yet

**Real billing** — `BILLING_PROVIDER=mock`. Plan changes go through the dev-only plan switcher on
`/farms`. No checkout, no webhook handler. See [docs/billing.md](docs/billing.md).

**Offline sync** — deliberately no service worker and no sync queue yet. See
[docs/offline-sync.md](docs/offline-sync.md).

**Advanced alerts** — declared in `lib/subscriptions/plans.ts` as a Pro feature with no
implementing code behind it yet. (Flock comparison and advanced reports were also listed here
and are in fact built and gated, at `lib/data/analytics.ts` and `lib/data/reports.ts`.)

Every route in the sidebar now points at a real page; nothing is shown as "Soon".

---

## Requirements

- **Node.js 20+** (developed on 24)
- **A container runtime** — the Supabase CLI needs one for local Postgres, Auth and Storage.
  Any of these work, and the commands are identical:
  - **Docker Desktop** — easiest on Windows. Free under the Personal plan for personal use and for
    companies under 250 employees *and* under $10M revenue; larger commercial use needs a paid seat.
  - **Podman Desktop** or **Rancher Desktop** — Apache-2.0, free for any use, officially supported
    by Supabase. Use these if the Docker Desktop licence does not clearly cover you.
  - **Docker Engine (CE) inside WSL2** — same engine, no Desktop licence.
- **Supabase CLI** — installed as a dev dependency, so `npx supabase` works with no global install

---

## First run

```bash
npm install
```

Create `.env.local` in the project root. These are the standard Supabase CLI local values —
identical on every machine that runs `supabase start`, published in Supabase's own docs, and
useless against any real project:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_APP_URL=http://localhost:3000
STORAGE_BUCKET=layerflow
BILLING_PROVIDER=mock
```

> `lib/config/env.ts` validates these at import. A missing variable fails loudly at startup rather
> than producing a confusing error deep inside a query.

Start the database and apply migrations plus seed data:

```bash
npm run db:start
```

```bash
npm run db:reset
```

`db:reset` is the moment of truth for the unverified SQL. If a migration has a bug, it surfaces
here. Then:

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with:

- **Email** `demo@layerflow.ph`
- **Password** `demo123456`

Local Supabase services: Studio on `54323`, API on `54321`, Postgres on `54322`, and Inbucket on
`54324` (all signup and reset emails land there instead of being sent).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests, single run (no database needed) |
| `npm run test:rls` | Tenant-isolation suite — **needs a running database**; skips cleanly without one |
| `npm run db:backup` | Dump the database to `backups/` (add `-- --local` for the local stack) |
| `npm run test:watch` | Vitest, watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck + lint + tests |
| `npm run db:start` / `db:stop` | Supabase local stack |
| `npm run db:reset` | Re-apply all migrations, then seed |
| `npm run db:diff` | Diff local schema into a new migration |
| `npm run db:push` | Push migrations to the linked cloud project |
| `npm run db:types` | Regenerate `lib/types/database.generated.ts` |

### About the database types

`lib/types/database.generated.ts` is generated from the live schema and is the source of truth.
`lib/types/database.ts` re-exports friendly aliases (`FarmRow`, `FarmRole`) from it and restates
nothing, so the two cannot drift. Regenerate after every migration with `npm run db:types`.

> **Gotcha worth knowing:** row types must be declared as `type` aliases, not `interface`.
> TypeScript interfaces have no implicit index signature, so `postgrest-js` silently degrades
> every query result to `never`. This cost real debugging time.

---

## Architecture

```
Next.js (App Router, Server Components)
  ↓  Server Actions / Route Handlers
Supabase
  ├── PostgreSQL   — schema + Row Level Security
  ├── Auth         — sessions, email confirmation, recovery
  └── Storage      — future attachments
```

A modular monolith. Business logic lives in `lib/`, never in components:

| Path | Responsibility |
|---|---|
| `lib/domain/` | Pure calculations and alert rules. No I/O — this is why they are testable. |
| `lib/data/` | Query and service layer. All Supabase access goes through here. |
| `lib/auth/` | Session, farm context, role permissions. |
| `lib/subscriptions/` | Plans, limits, entitlements. |
| `lib/validation/` | Zod schemas shared by client and server. |

More in [docs/architecture.md](docs/architecture.md).

---

## Security

Tenant isolation is enforced by **PostgreSQL Row Level Security**, not by middleware. Middleware
redirects are a convenience; RLS is the control.

- Every farm-owned table is deny-by-default and reachable only through a `farm_members` row.
- `farm_id` is **always derived server-side** from the authenticated user, never accepted from the
  client.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It is confined to `lib/supabase/admin.ts`,
  which imports `server-only` so bundling it into client code is a build error.

Full model in [docs/security.md](docs/security.md).

---

## Documentation

- [architecture.md](docs/architecture.md) — layering, data flow, conventions
- [database.md](docs/database.md) — schema, constraints, indexes, migrations
- [security.md](docs/security.md) — RLS, roles, authorization, threat notes
- [deployment.md](docs/deployment.md) — Vercel + Supabase, backups, rollback
- [billing.md](docs/billing.md) — plans, entitlements, provider abstraction
- [offline-sync.md](docs/offline-sync.md) — the offline design, and why it is not built yet

---

## Known issues and follow-ups

- **Fonts require network at build.** `next/font/google` fetches Bricolage Grotesque and Public
  Sans at build time. An offline build machine will fail; fall back to a system stack in
  `app/layout.tsx` if that is a constraint.
- **PWA icon has one size.** `manifest.webmanifest` now points at the real
  `public/icons/layerflow-logo.png` (1254×1254) rather than the placeholder SVGs, but there are no
  dedicated 192px/512px resized variants yet — some install surfaces prefer exact sizes over one
  large image scaled down. Needs an image-resizing pass, not something this environment can do.
  There is also no dedicated maskable icon: the logo is mostly transparent line art (~8% opaque,
  see docs/design-system.md), which would look broken if OS-masked into a shape with a background
  showing through the gaps — a real maskable variant needs an opaque backing shape design, not just
  a resize.
- **`next lint` is deprecated** and will be removed in Next.js 16. Migrate with
  `npx @next/codemod@canary next-lint-to-eslint-cli .`
- **`.env.example` was not reviewed** — it was blocked by local permission settings during
  development. Check it matches the variables listed above.
- **Feed cost is excluded from `FEED`-category expenses** in profit calculations, because feed is
  already costed through `feed_usage`. Counting both would double-charge the farm. See
  `calculateOperatingCosts` in `lib/data/dashboard.ts`.
