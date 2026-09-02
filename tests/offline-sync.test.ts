import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueWrite, generateWriteId, listPending, markSynced } from "@/lib/offline/queue";
import type { ProductionConflict } from "@/lib/offline/db";

// Node's built-in `navigator` global has no `onLine` (it's undefined), which
// drainQueue's connectivity guard reads as "offline" and returns immediately
// on. Stub it so these tests exercise the actual dispatch logic.
vi.stubGlobal("navigator", { onLine: true });

const recordProductionAction = vi.fn();
const recordMortalityAction = vi.fn();
const recordFeedUsageAction = vi.fn();

vi.mock("@/app/(app)/production/actions", () => ({
  recordProductionAction: (...args: unknown[]) => recordProductionAction(...args),
}));
vi.mock("@/app/(app)/health/actions", () => ({
  recordMortalityAction: (...args: unknown[]) => recordMortalityAction(...args),
  recordFeedUsageAction: (...args: unknown[]) => recordFeedUsageAction(...args),
}));

// Imported after the mocks above so sync.ts picks up the mocked actions.
const { drainQueue } = await import("@/lib/offline/sync");

/**
 * sync.ts's dispatch logic, against the real (fake) IndexedDB queue but with
 * the server actions it calls mocked -- no network, no Supabase. Focused on
 * what step 5 (conflict detection) needs: routing a conflict result to
 * markConflict instead of markAttemptFailed, and never re-submitting a
 * conflicted item. Not exhaustive backoff-timing coverage.
 */

afterEach(async () => {
  vi.clearAllMocks();
  const items = await listPending();
  for (const item of items) await markSynced(item.id);
});

const PRODUCTION_PAYLOAD = {
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
};

const SAMPLE_CONFLICT: ProductionConflict = {
  serverUpdatedAt: "2026-01-02T00:00:00.000Z",
  server: {
    hensPresent: 100,
    eggsCollected: 90,
    brokenEggs: 1,
    dirtyEggs: 0,
    mortality: 0,
    notes: "",
    averageEggWeight: null,
    sizes: {},
  },
};

describe("drainQueue", () => {
  it("marks a write synced on success", async () => {
    recordProductionAction.mockResolvedValue({ ok: true, data: { productionId: "p1" } });

    const id = generateWriteId();
    await enqueueWrite({ id, kind: "daily_production", payload: PRODUCTION_PAYLOAD });

    await drainQueue();

    const pending = await listPending();
    expect(pending.some((item) => item.id === id)).toBe(false);
    expect(recordProductionAction).toHaveBeenCalledWith(
      PRODUCTION_PAYLOAD,
      expect.objectContaining({ queuedAt: expect.any(Number) })
    );
  });

  it("marks a validation failure as permanently failed, not conflicted", async () => {
    recordProductionAction.mockResolvedValue({
      ok: false,
      error: "Please check the numbers.",
      fieldErrors: { eggsCollected: "Required" },
    });

    const id = generateWriteId();
    await enqueueWrite({ id, kind: "daily_production", payload: PRODUCTION_PAYLOAD });

    await drainQueue();

    const record = (await listPending()).find((item) => item.id === id);
    expect(record?.status).toBe("failed");
    expect(record?.conflict).toBeUndefined();
  });

  it("routes a conflict result to markConflict instead of markAttemptFailed", async () => {
    recordProductionAction.mockResolvedValue({
      ok: true,
      data: { productionId: "p1", conflict: SAMPLE_CONFLICT },
    });

    const id = generateWriteId();
    await enqueueWrite({ id, kind: "daily_production", payload: PRODUCTION_PAYLOAD });

    await drainQueue();

    const record = (await listPending()).find((item) => item.id === id);
    expect(record?.status).toBe("conflict");
    expect(record?.conflict).toEqual(SAMPLE_CONFLICT);
    expect(record?.lastError).toBeUndefined();
  });

  it("never re-submits a conflicted item on a later pass", async () => {
    recordProductionAction.mockResolvedValue({
      ok: true,
      data: { productionId: "p1", conflict: SAMPLE_CONFLICT },
    });

    const id = generateWriteId();
    await enqueueWrite({ id, kind: "daily_production", payload: PRODUCTION_PAYLOAD });

    await drainQueue();
    expect(recordProductionAction).toHaveBeenCalledTimes(1);

    await drainQueue();
    expect(recordProductionAction).toHaveBeenCalledTimes(1);

    const record = (await listPending()).find((item) => item.id === id);
    expect(record?.status).toBe("conflict");
  });
});
