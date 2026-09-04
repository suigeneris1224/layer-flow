# Deployment

Target: **Cloudflare Workers + Supabase Cloud**. The same code runs locally and in production;
only environment configuration differs. No business logic is environment-specific — moving off
Vercel changed nothing about the app itself, only how it's built and hosted (see `open-next.config.ts`,
`wrangler.jsonc`, `workers/cron-worker.ts`).

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

## 5. Cloudflare Workers

The app deploys via [OpenNext's Cloudflare adapter](https://opennext.js.org/cloudflare)
(`@opennextjs/cloudflare`), not the older "Cloudflare Pages" Next.js support and not Cloudflare's
experimental `vinext` — OpenNext is the mature, production path, and requires no code changes
because the app never sets `export const runtime = "edge"` anywhere; everything already runs on
the Node.js runtime OpenNext expects.

**One-time setup:**
```bash
npx wrangler login
```

**Build and deploy:**
```bash
npm run cf:build    # next build, then opennextjs-cloudflare's bundling step
npm run cf:deploy    # uploads the built Worker to Cloudflare
```
(`npm run cf:preview` runs the built Worker locally via `wrangler dev` for a final check before
deploying — see the Windows note below.)

Cloudflare splits environment variables into two buckets, both needed:

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Build var + runtime var | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build var + runtime var | Safe in the browser; RLS constrains it |
| `NEXT_PUBLIC_APP_URL` | Build var + runtime var | `https://yourdomain.com` (or the `*.workers.dev` URL before a custom domain is attached) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | **Server only. Never prefix with `NEXT_PUBLIC_`.** |
| `STORAGE_BUCKET` | Runtime var | `layerflow` |
| `BILLING_PROVIDER` | Runtime var | `paymongo` or `stripe` when real billing lands |
| `BILLING_SECRET_KEY` | Secret | Server only |
| `EMAIL_PROVIDER`, `EMAIL_FROM` | Runtime var | `EMAIL_PROVIDER=mock` logs instead of sending (local/dev/test); set to `brevo` in production |
| `BREVO_API_KEY` | Secret | Required when `EMAIL_PROVIDER=brevo`. Free-tier Brevo caps at 300 emails/day |
| `CRON_SECRET` | Secret | The scheduled Worker (`workers/cron-worker.ts`) sends it as `Authorization: Bearer <value>` — same value the route already expected under Vercel Cron |
| `ADMIN_EMAILS` | Secret | Comma-separated, lowercase. Gates `/admin`; blank means nobody can reach it |

`NEXT_PUBLIC_*` values are needed at **build** time too (to inline into the client bundle), not
just at runtime — set them as both a Cloudflare "Build variable" and a runtime binding, or the
build will inline an empty/stale value. Everything else only needs to exist at runtime.

Locally, `wrangler dev`/`cf:preview` picks up `.env.local` automatically for these — no separate
`.dev.vars` file needed.

> **Build needs network access for fonts.** `next/font/google` fetches Bricolage Grotesque and
> Public Sans at build time. Cloudflare's build environment has network access, so this is fine —
> but a fully offline/restricted CI box will fail the build, same as it would have on Vercel.

> **Windows note.** `wrangler dev`/`cf:preview`'s local `workerd` runtime is not fully compatible
> with native Windows (confirmed directly: it starts, then crashes silently with no error output,
> a known limitation — Cloudflare's own tooling warns about this on every build). `npm run cf:build`
> and `npm run cf:deploy` are unaffected (they don't run the app locally, just bundle and upload
> it), so this only blocks the local-preview step. If you need reliable local preview, run it from
> WSL instead of native Windows; otherwise skip straight to a real deploy on a workers.dev URL for
> testing.

**Cron**: `vercel.json`'s daily cron (`/api/cron/subscription-emails`, 01:00 UTC) is replaced by a
Cloudflare Cron Trigger declared in `wrangler.jsonc`'s `triggers.crons`, handled by
`workers/cron-worker.ts`'s `scheduled()` export. It calls the exact same route with the exact same
bearer secret — the route itself needed no changes. Test it directly with:
```bash
curl "http://127.0.0.1:8787/cdn-cgi/local/scheduled"   # local preview
```
or the "Trigger Cron" button on the Worker's dashboard page once deployed.

## 6. Domain and HTTPS

Add a custom domain to the Worker from its Cloudflare dashboard page (**Settings → Domains &
Routes**) — HTTPS and renewal are automatic. Update `NEXT_PUBLIC_APP_URL` and the Supabase Site
URL to match, or auth redirects will break.

Since the app is already hosted on Cloudflare, domain purchase and DNS both live in the same
account and zone as everything below — there's no separate registrar/DNS host to keep in sync
the way there was when Vercel hosted the app and Cloudflare only handled DNS.

### Support inbox, for free

A `support@layerflow.ph` inbox costs real money at most registrars; **Cloudflare Email Routing**
forwards it to a personal inbox at no cost and needs no mailbox — same Cloudflare zone the domain
and the Worker already live in:

1. In Cloudflare → **Email → Email Routing**, verify the domain and add a rule:
   `support@layerflow.ph` → your personal address.
2. Confirm the Worker's custom-domain DNS record (from step 6 above) and the Email Routing MX/TXT
   records coexist in the same zone without conflicting — Cloudflare manages both automatically
   once Email Routing is enabled.

This is receive-only: mail sent *to* `support@layerflow.ph` lands in a personal inbox. It has no
effect on `EMAIL_FROM` (Brevo, in the table above) — that is what farmers see in the *From* line
of receipt/reminder emails, and stays whatever address is verified in Brevo until deliberately
changed.

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

- The Worker's dashboard page (**Logs**) gives you real-time request logs; **Observability →
  Workers Analytics Engine** (or `wrangler tail`) covers errors and latency.
- Supabase logs live under **Logs** in the dashboard.
- `logger` emits one JSON line per event in production, which Cloudflare's log stream carries the
  same way Vercel's log drains did.
- To add Sentry or similar, implement `reportError` in `lib/observability/logger.ts`. Nothing else
  changes.

Worth alerting on: server action error rate, failed logins, and p95 dashboard response time.

## 9. Rollback

**Application** — Cloudflare keeps a history of Worker deployments (dashboard **Deployments**
tab, or `wrangler rollback [deployment-id]`). Rollback is near-instant and does not touch the
database.

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
