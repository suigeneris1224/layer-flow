-- ---------------------------------------------------------------------------
-- Annual billing
-- ---------------------------------------------------------------------------
-- Starter/Pro can now be billed monthly or annually (lib/subscriptions/plans.ts
-- carries both prices). Subscriptions are account-wide (owner_id, see
-- 20250101002300_account_subscriptions.sql) -- this cadence applies to the
-- whole account, same as plan/status already do.
create type billing_period as enum ('MONTHLY', 'ANNUAL');

alter table subscriptions
  add column billing_period billing_period not null default 'MONTHLY';
