import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DailyProductionInput, FeedUsageInput, MortalityRecordInput } from "@/lib/validation/schemas";

/**
 * The offline write queue, per docs/offline-sync.md.
 *
 * IndexedDB, not localStorage: structured records, no 5MB ceiling, and async
 * so it never blocks the main thread while a farmer is typing. One store,
 * `pending_writes`, matching the doc's shape exactly.
 */

export type PendingWriteKind = "daily_production" | "mortality" | "feed_usage";

export type PendingWritePayload =
  | { kind: "daily_production"; value: DailyProductionInput }
  | { kind: "mortality"; value: MortalityRecordInput }
  | { kind: "feed_usage"; value: FeedUsageInput };

export type PendingWriteStatus = "pending" | "syncing" | "failed" | "conflict";

/**
 * The competing server state for a `"daily_production"` write that lost the
 * conflict check in `record_daily_production` (see
 * supabase/migrations/20250101001700_production_conflict_detection.sql). Only
 * `daily_production` can genuinely collide across devices -- mortality/feed
 * writes upsert on a fresh client-generated id, so they never do.
 */
export interface ProductionConflict {
  serverUpdatedAt: string;
  server: {
    hensPresent: number;
    eggsCollected: number;
    brokenEggs: number;
    dirtyEggs: number;
    mortality: number;
    notes: string;
    averageEggWeight: number | null;
    /** Quantity per egg size id. */
    sizes: Record<string, number>;
  };
}

export interface PendingWrite {
  /** Client-generated UUID -- the idempotency key. */
  id: string;
  kind: PendingWriteKind;
  payload: PendingWritePayload["value"];
  createdAt: number;
  attempts: number;
  lastError?: string;
  /** When the most recent attempt happened, for backoff timing. */
  lastAttemptAt?: number;
  status: PendingWriteStatus;
  /** Set only when status is "conflict" -- what the review screen shows. */
  conflict?: ProductionConflict;
}

interface OfflineDB extends DBSchema {
  pending_writes: {
    key: string;
    value: PendingWrite;
    indexes: { "by-createdAt": number };
  };
}

const DB_NAME = "layerflow-offline";
const DB_VERSION = 1;
const STORE = "pending_writes";

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

/**
 * Opens (and lazily creates) the offline database.
 *
 * Memoised per tab: every caller in this module shares one connection rather
 * than each re-opening it, which is the idb-recommended pattern.
 */
export function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }

  dbPromise ??= openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("by-createdAt", "createdAt");
    },
  });

  return dbPromise;
}

export { STORE as PENDING_WRITES_STORE };
