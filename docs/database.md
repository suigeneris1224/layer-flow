# Database

PostgreSQL on Supabase. Migrations in `supabase/migrations/` are the **single source of truth** —
never create a table through Studio. Studio is for inspection and administration.

> **Status: verified.** All twelve migrations apply cleanly to PostgreSQL 15 and the seed loads.

## Migrations

| File | Contents |
|---|---|
| `20250101000000_core.sql` | Profiles, farms, farm members, houses, flocks, auth helpers |
| `20250101000100_production.sql` | Egg sizes, prices, daily production, breakdown, feed, mortality |
| `20250101000200_commerce.sql` | Customers, sales, expenses, adjustments, inventory view |
| `20250101000300_saas.sql` | Subscriptions, audit logs |
| `20250101000400_rls.sql` | Row Level Security for every table |
| `20250101000500_production_rpc.sql` | Atomic daily production write |
| `20250101000600_grants.sql` | Table privileges for the PostgREST roles |
| `20250101000700_grading_summary.sql` | Grading summary helper |
| `20250101000800_set_egg_price.sql` | Effective-dated price write |
| `20250101000900_sale_payments.sql` | Sale payments |
| `20250101001000_sale_payment_action.sql` | Record-a-payment RPC |
| `20250101001100_flock_ops.sql` | Flock-farm guards, hen recalc fix, avatar bucket |

```bash
npx supabase migration new <name>   # create
npm run db:reset                    # re-apply everything + seed
npm run db:diff                     # capture manual changes into a migration
npm run db:push                     # apply to the linked cloud project
```

### The grants trap (learned the hard way)

Migrations run as the `postgres` role. In Supabase, the default privileges for objects created by
that role grant only `TRUNCATE`/`REFERENCES`/`TRIGGER` to `anon`, `authenticated` and
`service_role` — **no SELECT, INSERT, UPDATE or DELETE**. Objects created by `supabase_admin` get
the full set, which is why tables made in the dashboard "just work" and tables made by a migration
do not.

The symptom is `permission denied for table X` on every query, including with the service-role
key. It is easy to misread as an RLS problem; it is not. RLS *filters rows* — it never raises
permission denied.

`20250101000600_grants.sql` fixes it and sets `ALTER DEFAULT PRIVILEGES` so future migrations do
not reintroduce it. Remember: **grants decide whether you may touch the table, RLS decides which
rows.** Both are required.

### Changing a price is two writes

`egg_prices` ranges may not overlap, and the upper bound is **inclusive**. So a price change closes
the current row at `newStart - 1` and inserts a new open-ended row — in one transaction, via
`public.set_egg_price` (`SECURITY INVOKER`).

Two consequences that are easy to get wrong:

- **Changing a price twice on the same day** must *replace* the row, not close it. Closing would set
  `effective_to` before `effective_from` and trip `egg_prices_range_valid`.
- Because the upper bound is inclusive, **a row ending today is still in force today** — it is not
  history yet. `classifyPrice` in `lib/domain/pricing.ts` is the single place that decides
  previous / current / scheduled.

## Conventions

- UUID primary keys, `gen_random_uuid()`
- `created_at` / `updated_at` on every table, `updated_at` maintained by a trigger
- Money is `NUMERIC(14,2)`; unit prices `NUMERIC(12,4)`. **Never** floating point.
- Foreign keys everywhere, with deliberate `on delete` behaviour
- Constraints in the database, not only in the application

## Design decisions worth knowing

### Mortality is a ledger; `current_hens` is derived

`mortality_records` is the single source of truth for losses. `flocks.current_hens` is recalculated
by trigger as `initial_hens - sum(mortality)`.

It is never hand-edited, so it cannot drift from the ledger. The daily production form writes one
*linked* mortality row (`daily_production_id` set); ad-hoc incidents leave that column null.
Reports sum `mortality_records` only, so nothing is double-counted.

`feed_usage` follows the same pattern, for the same reason: without the link, re-saving a day
would stack duplicate feed rows.

**The rule this creates for application code:** `record_daily_production` *owns* every mortality
and feed row whose `daily_production_id` is set. Each time a day is saved it deletes and re-inserts
them — and a day saved with zero feed deletes the linked feed row outright. So the standalone
screens under `/health` read and write only rows where that column is null, and every query and
mutation there carries `.is("daily_production_id", null)`. Drop that filter and a farmer can edit a
row the next save is about to overwrite.

`20250101001100_flock_ops.sql` also fixed a bug in the recalc trigger: it took
`coalesce(new.flock_id, old.flock_id)`, which picks NEW first, so moving a mortality record between
flocks recalculated only the destination and left the source overstated. It now recalculates both
sides of a move, and branches on `TG_OP` rather than reading a record that is unassigned.

The same migration added `app.assert_flock_farm_matches()` to `mortality_records`, `feed_usage` and
`vaccinations`. The RPC always derives `farm_id` from the flock so it could never disagree; the
standalone insert paths can, and RLS alone would not catch it — a farm you own claiming a flock you
do not passes the policy and fails the trigger.

### Egg size totals are checked at commit

The breakdown may not claim more eggs than were collected. Enforced by **deferred constraint
triggers**, so a multi-row rewrite is judged on its end state rather than row by row — a plain
row-level trigger would reject a valid reshuffle mid-update.

Leaving eggs *unassigned* is allowed on purpose. Farmers grade a partial batch and finish later.
Only an over-count is an error.

### Prices are effective-dated, and history is immutable

`egg_prices` carries `effective_from` / `effective_to`, with a **GiST exclusion constraint**
preventing overlapping ranges for the same size:

```sql
exclude using gist (
  farm_id with =, egg_size_id with =,
  daterange(effective_from, effective_to, '[]') with &&
)
```

`egg_sale_items` **copies** the price used at sale time. Re-pricing the farm must never restate a
past sale. This is why the sale item stores `price_per_egg` and `price_per_tray` rather than
joining to the price list.

### Inventory is a view, not a running total

`egg_inventory_balances` computes `produced + adjusted - sold` per farm per size.

A view cannot drift out of sync the way a cached counter can, and at MVP volumes the aggregate is
cheap. Revisit if a farm ever outgrows it — that is a good problem to have.

The view is `security_invoker = true`, so it respects the caller's RLS rather than the view
owner's.

### Egg sizes are configurable, not an enum

Farms rename, disable and reorder their own categories, so `egg_sizes` is a per-farm table.
`app.seed_default_egg_sizes()` creates the five defaults (Small → Jumbo) for a new farm.

### Deleting a farm is blocked by RESTRICT chains

Four foreign keys are `ON DELETE RESTRICT`, so deleting a farm does **not** cascade cleanly:

```
flocks.house_id                       -> houses
daily_egg_size_production.egg_size_id -> egg_sizes
egg_sale_items.egg_size_id            -> egg_sizes
egg_inventory_adjustments.egg_size_id -> egg_sizes
```

The cascade reaches `houses` and `egg_sizes`, whose dependents refuse to let go, and the whole
statement aborts. Children must be removed first, in an order where each step unblocks the next --
see `cleanup()` in `tests/rls/helpers.ts`.

This is not only a test concern: **a farm cannot currently be deleted through the app either**,
which will matter for account deletion.

## Indexes

Every foreign key is indexed, plus composites for the queries that actually run:

- `daily_production (farm_id, production_date desc)` and `(flock_id, production_date desc)`
- `feed_usage (farm_id, usage_date desc)` and `(flock_id, usage_date desc)`
- `egg_sales (farm_id, sale_date desc)`
- `expenses (farm_id, expense_date desc)` and `(farm_id, category)`
- `flocks (farm_id, status)` — for the active-flock count that plan limits depend on
- `mortality_records (farm_id, record_date desc)` and `(flock_id, record_date desc)`

The dashboard reads a 14-day window per farm, which these cover.

## Uniqueness

| Constraint | Why |
|---|---|
| `daily_production (flock_id, production_date)` | One record per flock per day |
| `houses (farm_id, name)` | Two "House A" on one farm is a mistake |
| `egg_sizes (farm_id, code)` | Stable code per farm |
| `farm_members (farm_id, user_id)` | One membership per person per farm |
| `mortality_records (daily_production_id)` | At most one auto row per production record |
| `feed_usage (daily_production_id)` partial | Same, but nulls allowed for ad-hoc entries |

## Types

`lib/types/database.generated.ts` is produced from the live schema and is the source of truth.
`lib/types/database.ts` only re-exports friendly aliases from it, so the two cannot drift.
Regenerate after every migration:

```bash
npm run db:types
```

> Row types **must** be `type` aliases, not `interface`. TypeScript interfaces have no implicit
> index signature, so `postgrest-js` silently resolves every query result to `never`.

## Storage

One bucket, `avatars`, created in `20250101001100_flock_ops.sql`. Public-read so a plain `<img src>`
works without signing every request; writes are fenced to `avatars/<user id>/…` by matching the
first path segment against `auth.uid()`. `profiles.avatar_url` holds the public URL with a
cache-busting query, since the object name is stable per user.

## Seed data

`supabase/seed.sql` builds San Remigio Egg Farm: House A (1,500 capacity), Flock #001 (ISA Brown,
1,000 hens placed ~32 weeks ago, 942 today after 58 losses), five egg sizes with prices, and 30
days of production, feed, mortality, sales and expenses.

It is deterministic rather than random, so every developer sees the same farm. The flock sells
about 92% of each day's collection, leaving a couple of days of working stock — a real layer farm
moves nearly everything daily, because eggs do not keep.

**Development only.** Never run it against production.
