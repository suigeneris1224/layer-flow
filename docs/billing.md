# Billing and plans

## Plans

| | Free | Starter | Pro |
|---|---|---|---|
| Price | ₱0 | **₱349/mo** | ₱899/mo |
| Farms | 1 | 1 | 3 |
| Houses | 1 | 3 | Unlimited |
| Active flocks | 1 | 5 | Unlimited |
| Users | 1 | 1 | 10 |
| Customers | — | 20 | Unlimited |
| History | 30 days | Unlimited | Unlimited |

Free covers daily production, egg sizes, basic inventory, mortality, feed and a basic dashboard.
Starter adds sales, full expenses, egg size analytics, charts, alerts, reports and offline mode.
Pro adds multiple farms, advanced reports, flock comparison, CSV export, team management,
cross-farm reporting and priority support.

Starter's Users stays at 1 -- team management (inviting a 2nd person) is Pro-only, so the limit
is never reached on Starter.

Everything above is defined **once**, in `lib/subscriptions/plans.ts`. The pricing page renders
from it. Nothing is hard-coded in JSX, and adding a plan is a one-file change.

## The rule

**Never test `plan === "PRO"` anywhere in the codebase.**

Ask the entitlement layer instead:

```ts
canAccess(subject, "egg_sales")            // is this feature available?
canCreate(subject, "active_flocks", count) // is there room for one more?
getPlanLimit(subject, "houses")            // what is the cap? null = unlimited
```

Scattered plan checks are how a pricing change turns into a week of grep.

## Server enforces, client explains

Every create path calls `assertCanCreate()` before writing. It throws `EntitlementError`, which
carries a farmer-readable prompt rather than a bare string:

> **You've reached the 1 active flock limit on Free.**
> Upgrade to Starter to manage up to 5 active flocks.
> `[Upgrade to Starter]`

Client-side checks exist only so a farmer is not shown a button that will reject them.

The CSV export routes are the one place this happens outside a server action. They assert
`data_export` before a single row is read, and because a route handler never runs
`app/(app)/layout.tsx`, they do their own `getSessionUser()` and `getFarmContext()` rather than
inheriting a farm the way every page does. They also carry the app's only role check that RLS
does not mirror: a worker may read `egg_sales`, so the `canManageSales` gate there is the sole
thing separating "see the summary" from "extract the whole customer list".

Counts always come from the database — `flocks` where status is `GROWING` or `PRODUCING`, for
instance. A sold or closed flock is history, not capacity in use, so it does not count against
the limit.

## Two deliberate kindnesses

**A lapsed subscription falls back to Free. It never locks the farm out.**

```ts
effectivePlan("PRO", "CANCELED") // → "FREE"
```

A farmer must always be able to reach their own records. A billing problem should never cost
someone their production history.

**`PAST_DUE` keeps full access.** A failed card in the Philippines is routine — a bank hiccup, an
expired card, a top-up that did not land. Cutting off the farm on day one of a payment problem
punishes the wrong thing. Access degrades only at `CANCELED` or `EXPIRED`.

## Downgrades never delete

Data is never removed when a plan changes. A farm dropping from Pro to Free keeps every record;
it simply creates less new data, and sees a narrower history window, until it moves back up.

`historyCutoffDate()` narrows *reads* on Free to 30 days. The rows are still there.

## Provider abstraction

The application must not depend on a provider's API shape. The interface is:

```ts
createCheckout()
cancelSubscription()
getSubscription()
handleWebhook()
```

Everything else talks to the `subscriptions` table and the entitlement functions.

### Current state

Two paths coexist on `/checkout`:

- **Manual QR/bank transfer** (`app/(app)/checkout/manual-qr-payment.tsx`) — a farmer pays outside
  the app and uploads a receipt; an admin approves it by hand
  (`app/admin/actions.ts`'s `adminApproveManualPaymentAction`). Always available, no dependency on
  anything below.
- **Automated GCash checkout via PayMongo** (`app/(app)/checkout/automated-checkout.tsx`,
  `lib/subscriptions/paymongo.ts`) — `BILLING_PROVIDER=paymongo` creates a PayMongo Link and
  activates the plan the moment `app/api/webhooks/paymongo/route.ts` confirms payment, no admin
  step. Built against **PayMongo's test-mode keys** (`sk_test_...`) since the account isn't yet
  approved for live/business use — see `docs/deployment.md`'s env var table for the go-live swap
  (test → live keys, no code change). GCash only at launch; cards/GrabPay/Maya are not wired up.

PayMongo has **no native recurring-subscription object** — a Link only ever pays for one billing
cycle. `subscriptions.current_period_end` stays the sole source of truth for renewal timing,
exactly as it already was for the manual flow; the existing renewal-reminder cron
(`app/api/cron/subscription-emails/route.ts`) needs no changes, since it queries `subscriptions`
generically regardless of how the last payment was made.

A development-only plan switcher also exists: `app/(app)/farms/dev-plan-switcher.tsx` with
`devSetSubscriptionAction` in `app/(app)/farms/actions.ts`. It renders on `/farms` only when
`!isProduction()` and the user can manage billing, so it can never appear on a live site, and it
writes through the service-role client because `subscriptions` has no client write policy.

### Webhook handling notes

- Webhooks have **no user session**, so they are the legitimate use of the service-role client.
- **Verify the signature before trusting the payload.** An unverified billing webhook is an
  unauthenticated write to your subscriptions table. `lib/subscriptions/paymongo.ts`'s
  `verifyWebhookSignature` does this for PayMongo's `Paymongo-Signature` header.
- Make handlers **idempotent** — providers retry, and will send the same event twice.
  `paymongo_payments.provider_link_id` is unique and doubles as the idempotency key: a retry finds
  zero `PENDING` rows left to claim and is a safe no-op.
- `subscriptions` has **no client write policy**. Only the webhook path, running as service role,
  writes it.
- Log every plan change to `audit_logs`.
