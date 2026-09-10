-- LayerFlow :: Brevo delivery-webhook events
--
-- audit_logs already records that an email was SENT (see AUDIT_ACTIONS.
-- SUBSCRIPTION_EMAIL_SENT). This table records what actually happened to it
-- afterwards -- delivered, opened, bounced -- reported by Brevo's own
-- transactional webhook (app/api/webhooks/brevo/route.ts), which has no user
-- session, so this is written exclusively by the service-role client, same
-- posture as manual_payments' status transitions.
create table email_events (
  id           uuid primary key default gen_random_uuid(),
  -- Brevo's own message id, when it sends one -- useful for correlating
  -- against audit_logs by hand, though nothing in-app joins on it (yet).
  message_id   text,
  recipient    text not null,
  -- delivered | opened | click | hard_bounce | soft_bounce | blocked | spam |
  -- deferred | error | request | unsubscribed -- whatever Brevo sends,
  -- verbatim, so a new event type Brevo adds later still lands here rather
  -- than being silently dropped by a check constraint.
  event        text not null,
  subject      text,
  -- The tag sendEmail() attached at send time (see lib/email/client.ts),
  -- e.g. "receipt" or "manual_payment_approved" -- lets the admin log show
  -- which template this event belongs to.
  tag          text,
  -- The full Brevo payload, for debugging a shape this table doesn't
  -- otherwise capture.
  raw          jsonb,
  occurred_at  timestamptz not null,
  created_at   timestamptz not null default now()
);

create index email_events_recipient_idx on email_events (recipient);
create index email_events_occurred_at_idx on email_events (occurred_at desc);

alter table email_events enable row level security;

-- No policy for `authenticated` at all: the webhook writes via
-- createSupabaseAdminClient(), and app/admin/email-logs/ reads the same way.
-- Defense-in-depth against 20250101000600_grants.sql's default-privileges
-- rule, which auto-grants full CRUD to `authenticated` on every new table.
revoke insert, update, delete, select on email_events from authenticated;
