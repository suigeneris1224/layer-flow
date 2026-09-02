import {
  getOfflineDB,
  PENDING_WRITES_STORE,
  type PendingWrite,
  type PendingWriteKind,
  type PendingWritePayload,
  type ProductionConflict,
} from "@/lib/offline/db";
import { emitQueueChange } from "@/lib/offline/events";

/**
 * CRUD over the `pending_writes` store. No network calls here -- see
 * lib/offline/sync.ts for what drains the queue.
 */

/**
 * A fresh idempotency key.
 *
 * The caller generates this *before* enqueueing, because for mortality and
 * feed writes it also has to travel inside the payload as `clientId` (see
 * supabase/migrations/20250101001400_offline_idempotency.sql) -- the queue
 * item's id and the write's idempotency key are the same value on purpose.
 */
export function generateWriteId(): string {
  return crypto.randomUUID();
}

export async function enqueueWrite(entry: {
  id: string;
  kind: PendingWriteKind;
  payload: PendingWritePayload["value"];
}): Promise<PendingWrite> {
  const db = await getOfflineDB();
  const record: PendingWrite = {
    id: entry.id,
    kind: entry.kind,
    payload: entry.payload,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };
  await db.add(PENDING_WRITES_STORE, record);
  emitQueueChange();
  return record;
}

/** Every write still in the queue, oldest first -- sync order matters. */
export async function listPending(): Promise<PendingWrite[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex(PENDING_WRITES_STORE, "by-createdAt");
}

/** How many writes are waiting, syncing, or stuck -- for the always-visible pending count. */
export async function pendingCount(): Promise<number> {
  const db = await getOfflineDB();
  return db.count(PENDING_WRITES_STORE);
}

export async function markSyncing(id: string): Promise<void> {
  const db = await getOfflineDB();
  const record = await db.get(PENDING_WRITES_STORE, id);
  if (!record) return;
  await db.put(PENDING_WRITES_STORE, { ...record, status: "syncing" });
  emitQueueChange();
}

/**
 * The server confirmed the write. Deleted, not archived -- per the doc's rule,
 * a queued record only ever leaves the store once it's genuinely safe.
 */
export async function markSynced(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete(PENDING_WRITES_STORE, id);
  emitQueueChange();
}

/**
 * A sync attempt failed. `permanent` decides whether it goes back to
 * `"pending"` (the engine will retry it with backoff) or `"failed"` (retries
 * exhausted, or the server said the write itself is invalid -- stuck until a
 * farmer looks at it). Never deleted either way: "never silently lose data."
 */
export async function markAttemptFailed(
  id: string,
  error: string,
  permanent: boolean
): Promise<void> {
  const db = await getOfflineDB();
  const record = await db.get(PENDING_WRITES_STORE, id);
  if (!record) return;
  await db.put(PENDING_WRITES_STORE, {
    ...record,
    status: permanent ? "failed" : "pending",
    attempts: record.attempts + 1,
    lastError: error,
    lastAttemptAt: Date.now(),
  });
  emitQueueChange();
}

/**
 * The server found a genuine disagreement -- a newer, different row already
 * exists (see the RPC's conflict check). Never auto-retried: `drainQueue`
 * skips `"conflict"` items exactly like `"failed"` ones, until the farmer
 * reviews it in the conflict screen and picks a side.
 */
export async function markConflict(id: string, conflict: ProductionConflict): Promise<void> {
  const db = await getOfflineDB();
  const record = await db.get(PENDING_WRITES_STORE, id);
  if (!record) return;
  await db.put(PENDING_WRITES_STORE, {
    ...record,
    status: "conflict",
    conflict,
    attempts: record.attempts + 1,
    lastAttemptAt: Date.now(),
  });
  emitQueueChange();
}

/**
 * The farmer chose "keep the server's version" in the conflict review. Unlike
 * `markSynced`, nothing was actually pushed here -- the server row was
 * already correct -- so this gets its own name rather than reusing that one
 * and implying a write happened.
 */
export async function discardConflict(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete(PENDING_WRITES_STORE, id);
  emitQueueChange();
}

/**
 * A farmer tapping "retry" on a stuck item. Resets it to a fresh `"pending"`
 * write so the sync engine picks it up on its next pass with no backoff wait
 * -- a deliberate tap should not sit behind the automatic retry schedule.
 */
export async function retryFailed(id: string): Promise<void> {
  const db = await getOfflineDB();
  const record = await db.get(PENDING_WRITES_STORE, id);
  if (!record) return;
  await db.put(PENDING_WRITES_STORE, {
    ...record,
    status: "pending",
    attempts: 0,
    lastAttemptAt: undefined,
  });
  emitQueueChange();
}
