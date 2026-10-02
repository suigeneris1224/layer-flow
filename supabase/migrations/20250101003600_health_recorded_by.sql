-- LayerFlow :: who logged a Mortality/Feed entry
--
-- Neither table tracked this before. It exists so the app can warn when two
-- different team members independently log what looks like the same
-- real-world event for the same flock on the same day (the offline
-- client_id key only dedupes retries of the *same* write, not two distinct
-- people's entries) -- see app/(app)/health/mortality-form.tsx and
-- feed-form.tsx's same-day warning.
--
-- Nullable, `on delete set null`: existing rows have no author to backfill,
-- and a departed team member's past entries must survive them, same
-- reasoning as account_deletion_requests.owner_id.
alter table mortality_records add column recorded_by uuid references auth.users (id) on delete set null;
alter table feed_usage add column recorded_by uuid references auth.users (id) on delete set null;
