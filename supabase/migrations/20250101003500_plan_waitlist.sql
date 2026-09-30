-- LayerFlow :: paid-plan waitlist (validation mode)
--
-- While BILLING_MODE=validation, LayerFlow takes no payment: an upgrade asks
-- for a waitlist entry and starts a free trial instead (docs/billing.md). This
-- table is that waitlist. It deliberately does not carry plan state -- the
-- plan lives in `subscriptions` alone, read through the entitlement layer; a
-- trial is simply subscriptions.status = 'TRIALING' with a period end.
--
-- One row per account (owner_id unique): joining again updates the details
-- but never resets trial_started_at, which is what enforces "one trial per
-- account".
create type waitlist_flock_size as enum ('UNDER_500', 'FROM_500_TO_2000', 'FROM_2000_TO_5000', 'OVER_5000');

create table plan_waitlist (
  id                  uuid primary key default gen_random_uuid(),
  -- Matches subscriptions.owner_id: the account that would pay.
  owner_id            uuid not null unique references auth.users (id) on delete cascade,
  farm_name           text not null,
  -- Normalised to +639XXXXXXXXX by lib/domain/phone.ts before it gets here.
  mobile_number       text not null,
  flock_size          waitlist_flock_size not null,
  plan_wanted         subscription_plan not null check (plan_wanted <> 'FREE'),
  -- When they ticked the contact-consent box (Data Privacy Act). Required to join.
  contact_consent_at  timestamptz not null,
  -- Set once when a trial starts and never cleared: null means "never trialled".
  trial_started_at    timestamptz,
  trial_ends_at       timestamptz,
  -- For the launch announcement, once paid plans open.
  launch_notified_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index plan_waitlist_created_at_idx on plan_waitlist (created_at desc);

create trigger plan_waitlist_touch
  before update on plan_waitlist
  for each row execute function app.touch_updated_at();

alter table plan_waitlist enable row level security;

-- A farmer can read only their own entry. Writes go through the service-role
-- client in joinWaitlistAction (same as paymongo_payments), and the explicit
-- revoke means a missing policy is not the only thing standing in the way.
create policy "plan_waitlist_select_own"
  on plan_waitlist for select
  to authenticated
  using (owner_id = auth.uid());

revoke insert, update, delete on plan_waitlist from authenticated;
