-- LayerFlow :: subscription email dedup markers
--
-- current_period_start/current_period_end already exist on `subscriptions`
-- (20250101000300_saas.sql) but no code has ever written them -- billing is
-- mock-only. app/(app)/farms/actions.ts's devSetSubscriptionAction now sets
-- them on every plan/status change, simulating a 30-day cycle, which is what
-- makes a real "renews on <date>" reminder possible.
--
-- These two columns record whether a reminder has already gone out for the
-- CURRENT episode: past_due_reminder_sent_at for the current PAST_DUE spell,
-- renewal_reminder_sent_at for the current current_period_end. Both are reset
-- to null on every plan/status change (a fresh episode), which is what lets
-- the cron route's dedup query be a plain `is(..., null)` rather than
-- anything smarter.
--
-- No RLS policy change: subscriptions already has no client write policy at
-- all (only service-role writes it), so these nullable additions need none.

alter table subscriptions
  add column past_due_reminder_sent_at timestamptz,
  add column renewal_reminder_sent_at  timestamptz;
