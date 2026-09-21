-- LayerFlow :: Account deletion requests (compliance)
--
-- A farmer requests deletion; a platform admin reviews and, on approval,
-- actually performs it (app/admin/actions.ts's adminApproveAccountDeletionAction).
-- Deliberately request-then-approve, not instant self-service: farms.owner_id
-- is `on delete restrict`, and an instant self-service delete would need its
-- own irreversible-confirmation UX with no human review at all. Mirrors
-- manual_payments' shape (supabase/migrations/20250101002600_manual_payments.sql)
-- almost exactly.
create type account_deletion_status as enum ('PENDING', 'COMPLETED', 'REJECTED');

create table account_deletion_requests (
  id                uuid primary key default gen_random_uuid(),
  -- SET NULL, not CASCADE, unlike manual_payments.owner_id: this row is
  -- meant to outlive the user -- it's the audit trail proving a deletion
  -- request existed and was handled, which must survive the user actually
  -- being deleted. `email` is snapshotted at request time for the same
  -- reason (it reads as "nobody" once owner_id goes null otherwise).
  owner_id          uuid references auth.users (id) on delete set null,
  email             text not null,
  reason            text,
  status            account_deletion_status not null default 'PENDING',
  reviewed_by       uuid references auth.users (id) on delete set null,
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index account_deletion_requests_owner_id_idx on account_deletion_requests (owner_id);
create index account_deletion_requests_pending_idx on account_deletion_requests (status)
  where status = 'PENDING';

create trigger account_deletion_requests_touch
  before update on account_deletion_requests
  for each row execute function app.touch_updated_at();

alter table account_deletion_requests enable row level security;

-- A farmer can submit and see only their own requests. No update/delete
-- policy for `authenticated` -- status transitions (approve/reject) happen
-- exclusively through the service-role admin actions, same as manual_payments.
create policy "account_deletion_requests_insert_own"
  on account_deletion_requests for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "account_deletion_requests_select_own"
  on account_deletion_requests for select
  to authenticated
  using (owner_id = auth.uid());
