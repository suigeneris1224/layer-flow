import { recordProductionAction } from "@/app/(app)/production/actions";
import { recordMortalityAction, recordFeedUsageAction } from "@/app/(app)/health/actions";
import {
  listPending,
  markAttemptFailed,
  markConflict,
  markSynced,
  markSyncing,
} from "@/lib/offline/queue";
import type { PendingWrite, ProductionConflict } from "@/lib/offline/db";

/**
 * Drains `pending_writes` by calling the same server actions the online forms
 * already use -- nothing here is a second write path, just a delayed call to
 * the first one.
 */

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 60_000;

/** Exponential, capped -- a rural connection that just came back is often barely there. */
function backoffDelay(attempts: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
}

function dueForRetry(item: PendingWrite): boolean {
  if (item.attempts === 0 || !item.lastAttemptAt) return true;
  return Date.now() - item.lastAttemptAt >= backoffDelay(item.attempts);
}

interface SyncOutcome {
  ok: boolean;
  /** A validation or entitlement failure will never succeed by retrying -- it needs a farmer, not the network. */
  permanent: boolean;
  error?: string;
  /** Set only for a daily_production write the server held off on. Never retried automatically -- see markConflict. */
  conflict?: ProductionConflict;
}

async function submitOne(item: PendingWrite): Promise<SyncOutcome> {
  try {
    if (item.kind === "daily_production") {
      const result = await recordProductionAction(item.payload, { queuedAt: item.createdAt });

      if (!result.ok) {
        const permanent = Boolean(result.fieldErrors) || Boolean(result.upgrade);
        return { ok: false, permanent, error: result.error };
      }
      if (result.data.conflict) {
        return {
          ok: false,
          permanent: true,
          error: "A newer version of this record exists on the server.",
          conflict: result.data.conflict,
        };
      }
      return { ok: true, permanent: false };
    }

    const result = await (item.kind === "mortality"
      ? recordMortalityAction(item.payload)
      : recordFeedUsageAction(item.payload));

    if (result.ok) return { ok: true, permanent: false };

    const permanent = Boolean(result.fieldErrors) || Boolean(result.upgrade);
    return { ok: false, permanent, error: result.error };
  } catch (error) {
    // A thrown error here is a network/server failure, not a rejected write
    // -- exactly the case retrying is for.
    return {
      ok: false,
      permanent: false,
      error: error instanceof Error ? error.message : "Couldn't reach the server.",
    };
  }
}

let draining = false;

/**
 * One pass over the queue, oldest write first. Sequential, not concurrent --
 * a connection that just returned is often slow, and racing several writes at
 * once against it is more likely to fail all of them than help any.
 *
 * Safe to call as often as triggers fire (`online`, tab focus, a manual retry
 * tap, a timer) -- `draining` makes overlapping calls a no-op rather than a
 * second concurrent pass.
 */
export async function drainQueue(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  draining = true;
  try {
    const items = await listPending();

    for (const item of items) {
      // "failed" is stuck until a farmer taps retry; "conflict" is stuck
      // until a farmer picks a version in the review screen. Neither is
      // ever auto-retried.
      if (item.status === "failed" || item.status === "conflict") continue;
      if (!dueForRetry(item)) continue;
      if (typeof navigator !== "undefined" && !navigator.onLine) break;

      await markSyncing(item.id);
      const outcome = await submitOne(item);

      if (outcome.ok) {
        await markSynced(item.id);
      } else if (outcome.conflict) {
        await markConflict(item.id, outcome.conflict);
      } else {
        const exhausted = item.attempts + 1 >= MAX_ATTEMPTS;
        await markAttemptFailed(item.id, outcome.error ?? "Sync failed.", outcome.permanent || exhausted);
      }
    }
  } finally {
    draining = false;
  }
}
