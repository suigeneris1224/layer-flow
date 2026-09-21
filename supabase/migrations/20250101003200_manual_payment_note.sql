-- LayerFlow :: Manual payment reconciliation note
--
-- A per-account code (lib/domain/manual-payment-note.ts's generatePaymentNote)
-- the farmer is asked to paste into GCash's own "note" field while sending
-- money, snapshotted here at submission time so an admin reviewing the
-- pending queue can compare it against what actually arrived in GCash.
-- Nullable: rows submitted before this column existed simply have none.
alter table manual_payments add column payment_note text;
