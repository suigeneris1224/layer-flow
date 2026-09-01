import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  enqueueWrite,
  generateWriteId,
  listPending,
  markAttemptFailed,
  markSynced,
  markSyncing,
  pendingCount,
  retryFailed,
} from "@/lib/offline/queue";

/**
 * The queue's CRUD against a real (fake) IndexedDB -- this is the store the
 * sync engine (lib/offline/sync.ts) drains, per docs/offline-sync.md.
 *
 * The doc's idempotency claim for mortality/feed retries (one row, not two)
 * lives in the Postgres unique index added by
 * supabase/migrations/20250101001400_offline_idempotency.sql and the upsert
 * branch in app/(app)/health/actions.ts -- neither is reachable from this
 * environment-free suite, so it's covered by review/manual verification
 * against a real database instead of a vitest case here.
 */

// The module memoises one DB connection; clean up after every test rather
// than assuming an empty store, so tests stay order-independent.
afterEach(async () => {
  const items = await listPending();
  for (const item of items) await markSynced(item.id);
});

describe("offline queue", () => {
  it("enqueues a write as pending with zero attempts", async () => {
    const id = generateWriteId();
    const record = await enqueueWrite({
      id,
      kind: "mortality",
      payload: { flockId: "flock-1", recordDate: "2026-01-01", quantity: 2, reason: "", notes: "" },
    });

    expect(record.id).toBe(id);
    expect(record.status).toBe("pending");
    expect(record.attempts).toBe(0);

    const pending = await listPending();
    expect(pending.map((item) => item.id)).toContain(id);
  });

  it("lists pending writes oldest first", async () => {
    const first = generateWriteId();
    const second = generateWriteId();

    await enqueueWrite({
      id: first,
      kind: "feed_usage",
      payload: { flockId: "flock-1", usageDate: "2026-01-01", quantityKg: 10, costPerKg: 0, feedType: "", notes: "" },
    });
    // enqueueWrite's order key is a wall-clock ms timestamp; two calls back to
    // back can otherwise land in the same millisecond and make the ordering
    // this test checks genuinely ambiguous rather than wrong.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await enqueueWrite({
      id: second,
      kind: "feed_usage",
      payload: { flockId: "flock-1", usageDate: "2026-01-02", quantityKg: 12, costPerKg: 0, feedType: "", notes: "" },
    });

    const pending = await listPending();
    const ids = pending.map((item) => item.id);
    expect(ids.indexOf(first)).toBeLessThan(ids.indexOf(second));
  });

  it("counts everything still in the queue", async () => {
    const before = await pendingCount();
    await enqueueWrite({
      id: generateWriteId(),
      kind: "daily_production",
      payload: {
        flockId: "flock-1",
        productionDate: "2026-01-01",
        hensPresent: 100,
        eggsCollected: 80,
        brokenEggs: 0,
        dirtyEggs: 0,
        mortality: 0,
        feedKg: 0,
        feedCostPerKg: 0,
        sizes: [],
        notes: "",
      },
    });
    expect(await pendingCount()).toBe(before + 1);
  });

  it("marks a write syncing without removing it", async () => {
    const id = generateWriteId();
    await enqueueWrite({
      id,
      kind: "mortality",
      payload: { flockId: "flock-1", recordDate: "2026-01-01", quantity: 1, reason: "", notes: "" },
    });

    await markSyncing(id);

    const pending = await listPending();
    expect(pending.find((item) => item.id === id)?.status).toBe("syncing");
  });

  it("deletes a write once synced", async () => {
    const id = generateWriteId();
    await enqueueWrite({
      id,
      kind: "mortality",
      payload: { flockId: "flock-1", recordDate: "2026-01-01", quantity: 1, reason: "", notes: "" },
    });

    await markSynced(id);

    const pending = await listPending();
    expect(pending.some((item) => item.id === id)).toBe(false);
  });

  it("sends a transient failure back to pending for the engine to retry", async () => {
    const id = generateWriteId();
    await enqueueWrite({
      id,
      kind: "feed_usage",
      payload: { flockId: "flock-1", usageDate: "2026-01-01", quantityKg: 5, costPerKg: 0, feedType: "", notes: "" },
    });

    await markAttemptFailed(id, "Network error", false);

    const record = (await listPending()).find((item) => item.id === id);
    expect(record?.status).toBe("pending");
    expect(record?.attempts).toBe(1);
    expect(record?.lastError).toBe("Network error");
  });

  it("marks a validation failure as permanently failed, not retried", async () => {
    const id = generateWriteId();
    await enqueueWrite({
      id,
      kind: "feed_usage",
      payload: { flockId: "flock-1", usageDate: "2026-01-01", quantityKg: 5, costPerKg: 0, feedType: "", notes: "" },
    });

    await markAttemptFailed(id, "Please check the form.", true);

    const record = (await listPending()).find((item) => item.id === id);
    expect(record?.status).toBe("failed");
  });

  it("never deletes a failed write -- it stays until retried", async () => {
    const id = generateWriteId();
    await enqueueWrite({
      id,
      kind: "feed_usage",
      payload: { flockId: "flock-1", usageDate: "2026-01-01", quantityKg: 5, costPerKg: 0, feedType: "", notes: "" },
    });
    await markAttemptFailed(id, "Server error", true);

    const record = (await listPending()).find((item) => item.id === id);
    expect(record).toBeDefined();
    expect(record?.status).toBe("failed");
  });

  it("resets a failed write to pending with zero attempts on retry", async () => {
    const id = generateWriteId();
    await enqueueWrite({
      id,
      kind: "feed_usage",
      payload: { flockId: "flock-1", usageDate: "2026-01-01", quantityKg: 5, costPerKg: 0, feedType: "", notes: "" },
    });
    await markAttemptFailed(id, "Server error", true);

    await retryFailed(id);

    const record = (await listPending()).find((item) => item.id === id);
    expect(record?.status).toBe("pending");
    expect(record?.attempts).toBe(0);
  });
});
