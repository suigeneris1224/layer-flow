-- LayerFlow :: Manual QR / bank transfer payments
--
-- A self-service alternative to the (not-yet-built) automated PayMongo
-- checkout: the farmer pays via GCash/Maya/bank transfer outside the app and
-- submits proof here for an admin to review.
--
-- Deliberately its own status enum, not a value added to subscription_status:
-- a pending manual payment describes this payment attempt, not the account's
-- actual entitlement, which stays untouched until an admin approves it (see
-- app/admin/actions.ts's adminApproveManualPaymentAction). Postgres enum
-- values are effectively permanent once added, and subscription_status is
-- checked throughout entitlements/reminders/admin filters -- not worth
-- committing to for what is really a one-table workflow detail.
create type manual_payment_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create table manual_payments (
  id                    uuid primary key default gen_random_uuid(),
  -- Matches subscriptions.owner_id: subscriptions are account-wide, and this
  -- is the account a manual payment is meant to upgrade.
  owner_id              uuid not null references auth.users (id) on delete cascade,
  -- Display context only (which farm the payer was looking at) -- never used
  -- for access control, since the write this leads to targets owner_id.
  farm_id               uuid references farms (id) on delete set null,
  plan                  subscription_plan not null,
  billing_period        billing_period not null,
  amount_centavos       integer not null check (amount_centavos >= 0),
  payer_name            text not null,
  reference_number      text not null,
  receipt_storage_path  text not null,
  status                manual_payment_status not null default 'PENDING',
  reviewed_by           uuid references auth.users (id) on delete set null,
  reviewed_at           timestamptz,
  rejection_reason      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index manual_payments_owner_id_idx on manual_payments (owner_id);
create index manual_payments_pending_idx on manual_payments (status) where status = 'PENDING';

create trigger manual_payments_touch
  before update on manual_payments
  for each row execute function app.touch_updated_at();

alter table manual_payments enable row level security;

-- A farmer can submit and see only their own account's payments. There is no
-- update/delete policy for `authenticated` -- status transitions (approve /
-- reject) happen exclusively through the service-role admin actions, same as
-- `subscriptions` itself.
create policy "manual_payments_insert_own"
  on manual_payments for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "manual_payments_select_own"
  on manual_payments for select
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Receipt storage :: private (unlike farm-photos). A payment receipt is
-- sensitive, so admin reads go through the service-role client and a
-- short-lived signed URL, never a public one or a broad `authenticated`
-- select policy.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('manual-payment-receipts', 'manual-payment-receipts', false)
on conflict (id) do nothing;

create policy "manual_receipts_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'manual-payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "manual_receipts_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'manual-payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
