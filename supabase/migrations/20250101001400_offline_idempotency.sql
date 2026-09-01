-- LayerFlow :: offline recording, idempotency for standalone writes
--
-- docs/offline-sync.md's "why the write path is already safe to retry" argument
-- only holds for daily production: record_daily_production upserts on
-- (flock_id, production_date), so replaying the same day twice updates one row.
--
-- Standalone mortality and feed entries have no such key -- recordMortalityAction
-- and recordFeedUsageAction are plain inserts. A queued offline write, retried
-- after a flaky sync, would create a duplicate loss or feed record with nothing
-- to stop it. client_id is that missing key: the offline queue generates one UUID
-- per write and sends it every attempt, so a retry lands on the same row.
--
-- Nullable, and the unique index is a plain (non-partial) one -- not
-- `where client_id is not null`. Two reasons:
--
--   1. Postgres won't use a partial index as an ON CONFLICT arbiter unless the
--      conflicting statement repeats the same WHERE clause, which
--      supabase-js's `.upsert({ onConflict })` has no way to express. Trying
--      this as a partial index made every offline sync fail with a generic
--      "23P01 no unique or exclusion constraint matching the specification"
--      error -- found by actually running the offline flow end-to-end, not
--      by review.
--   2. It doesn't need to be partial anyway: standard SQL treats every NULL
--      as distinct from every other NULL in a unique index, so any number of
--      rows with client_id null -- i.e. every existing and future online
--      submission from these two forms, which sends no client_id at all --
--      already coexist without conflict, exactly as they do today.

alter table mortality_records add column client_id uuid;
alter table feed_usage add column client_id uuid;

create unique index mortality_records_client_id_key
  on mortality_records (farm_id, client_id);

create unique index feed_usage_client_id_key
  on feed_usage (farm_id, client_id);
