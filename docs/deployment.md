# Deployment

Target: **Vercel + Supabase Cloud**. The same code runs locally and in production; only
environment configuration differs. No business logic is environment-specific.

> Do not deploy until the migrations have been executed and verified locally. See the README.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com). Choose the region nearest your users
   — **Southeast Asia (Singapore)** for Philippine farms.
2. Save the database password somewhere safe. It is shown once.
3. From **Project Settings → API**, collect the project URL, the `anon` key, and the
   `service_role` key.

## 2. Apply migrations

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npm run db:push
```

Verify in Studio: every table present, and **RLS enabled on all 19 tables**. A table with RLS off
is readable by every authenticated user of your project.

**Do not run `supabase/seed.sql` against production.** It creates a demo account with a known
password.

## 3. Auth configuration

In **Authentication → Providers → Email**:

- ✅ **Enable "Confirm email".** It is off locally so the demo account works; leaving it off in
  production lets anyone register any address.
- Set **Site URL** to your production domain.
- Add redirect URLs: `https://yourdomain.com/auth/callback` and
  `https://yourdomain.com/auth/callback?next=/reset-password`.

Configure a real SMTP provider under **Project Settings → Auth → SMTP**. The built-in sender is
rate-limited and not for production.

## 4. Storage

Create the bucket named in `STORAGE_BUCKET` (default `layerflow`). Keep it **private** and add
policies scoped to farm membership. Nothing in the current slice uploads files, so this can wait.

## 5. Vercel

Import the repository, then set environment variables for **Production**, **Preview** and
**Development**:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe in the browser; RLS constrains it |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only. Never prefix with `NEXT_PUBLIC_`.** |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |
| `STORAGE_BUCKET` | `layerflow` |
| `BILLING_PROVIDER` | `paymongo` or `stripe` when real billing lands |
| `BILLING_SECRET_KEY` | Server only |
| `EMAIL_PROVIDER`, `EMAIL_FROM` | As configured |

Build settings are the defaults: `npm run build`, output `.next`.

> **Build needs network access for fonts.** `next/font/google` fetches Bricolage Grotesque and
> Public Sans at build time. Vercel has network access, so this is fine there — but a restricted
> CI box will fail the build.

## 6. Domain and HTTPS

Add the domain in Vercel and follow the DNS instructions. HTTPS and renewal are automatic. Update
`NEXT_PUBLIC_APP_URL` and the Supabase Site URL to match, or auth redirects will break.

## 7. Backups

Supabase takes **daily automatic backups on paid plans**. Free-tier projects are **not** backed
up — do not run a real farm's records on free tier.

**A backup you have never restored is a hope, not a backup.** Quarterly:

1. Create a scratch Supabase project.
2. Restore the most recent backup into it.
3. Point a local checkout at it and confirm the dashboard renders real data.
4. Write down how long the whole thing took. That number is your actual recovery time.

For an off-provider copy:

```bash
npx supabase db dump --db-url "<connection-string>" -f backup.sql
```

Store it somewhere that is not Supabase. Losing your provider and your backups together is the
scenario that ends a business.

## 8. Monitoring

- Vercel gives you request logs and errors out of the box.
- Supabase logs live under **Logs** in the dashboard.
- `logger` emits one JSON line per event in production, which Vercel log drains parse directly.
- To add Sentry or similar, implement `reportError` in `lib/observability/logger.ts`. Nothing else
  changes.

Worth alerting on: server action error rate, failed logins, and p95 dashboard response time.

## 9. Rollback

**Application** — Vercel keeps every deployment. Promote the previous one from the dashboard.
Rollback is near-instant and does not touch the database.

**Database** — migrations are forward-only. There is no `down`.

This asymmetry matters: **an application rollback does not undo a migration.** So make migrations
backward-compatible with the previous release wherever you can:

- Add a column as nullable, backfill, and only then enforce `not null` — in a later migration.
- Never rename or drop a column in the same release that stops using it. Ship the code change
  first, drop the column next release.
- Expand, then contract.

If a migration must be reversed, write a new forward migration that undoes it, test it locally
with `npm run db:reset`, and push that.

For catastrophic data loss, restore from backup — accepting the loss of everything written since.
Know your restore time before you need it.

## Pre-launch checklist

- [ ] Migrations applied and verified against production
- [ ] **RLS confirmed enabled on all 19 tables**
- [ ] Email confirmation **on**
- [ ] Real SMTP configured
- [ ] Site URL and redirect URLs match the live domain
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set as a server-only variable
- [ ] Seed data **not** present
- [ ] Backups enabled — and a restore actually rehearsed
- [ ] `npm run verify` passes on the deployed commit
- [ ] Tenant isolation tested with two real accounts on production
