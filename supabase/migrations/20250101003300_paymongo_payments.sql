-- LayerFlow :: PayMongo automated checkout ledger
--
-- One row per PayMongo Link created for a billing cycle. `provider_link_id`
-- doubles as the idempotency key for the webhook (supabase/migrations has no
-- separate processed-events table for this): PayMongo's own resource id
-- cannot change across retries of the same event, so
-- `update ... where provider_link_id = $1 and status = 'PENDING'` is enough
-- to make a duplicate delivery a safe no-op. Mirrors manual_payments'
-- shape/RLS conventions (20250101002600_manual_payments.sql) -- this is the
-- automated sibling of that table, not a replacement for it.
create type paymongo_payment_status as enum ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

create table paymongo_payments (
  id                    uuid primary key default gen_random_uuid(),
  -- Matches subscriptions.owner_id: subscriptions are account-wide, and this
  -- is the account a payment is meant to upgrade.
  owner_id              uuid not null references auth.users (id) on delete cascade,
  -- Display context only, never used for access control -- same as manual_payments.farm_id.
  farm_id               uuid references farms (id) on delete set null,
  plan                  subscription_plan not null,
  billing_period        billing_period not null,
  amount_centavos       integer not null check (amount_centavos >= 0),
  -- PayMongo Link id (e.g. "link_xxx") -- unique, and the idempotency key above.
  provider_link_id      text not null unique,
  -- Filled once the webhook reports a paid event.
  provider_payment_id   text,
  checkout_url          text not null,
  status                paymongo_payment_status not null default 'PENDING',
  paid_at               timestamptz,
  raw_webhook_payload   jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index paymongo_payments_owner_id_idx on paymongo_payments (owner_id);
create index paymongo_payments_pending_idx on paymongo_payments (status) where status = 'PENDING';

create trigger paymongo_payments_touch
  before update on paymongo_payments
  for each row execute function app.touch_updated_at();

alter table paymongo_payments enable row level security;

-- A farmer can see only their own account's payments. No insert/update/delete
-- policy for `authenticated` -- the checkout action inserts through the
-- service-role client (same as manual_payments' review actions), and only
-- the webhook (service role) ever updates status/paid_at.
create policy "paymongo_payments_select_own"
  on paymongo_payments for select
  to authenticated
  using (owner_id = auth.uid());
