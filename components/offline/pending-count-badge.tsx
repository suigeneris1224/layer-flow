"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { pendingCount } from "@/lib/offline/queue";
import { onQueueChange } from "@/lib/offline/events";

/**
 * A persistent numeric count, always visible while the offline queue is
 * non-empty (docs/offline-sync.md: "A pending count is always visible while
 * the queue is non-empty" -- offline-status.tsx's banner only covers some of
 * its own states, not this).
 *
 * Deliberately not gated on offline_mode: it must keep showing legacy items
 * on a downgraded plan too, same reasoning as offline-status.tsx's
 * not-entitled banner.
 */
export function PendingCountBadge() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await pendingCount());
  }, []);

  useEffect(() => {
    refresh();
    return onQueueChange(refresh);
  }, [refresh]);

  if (count === 0) return null;

  return (
    <span className="relative flex size-11 items-center justify-center rounded-md">
      <Cloud className="size-5" aria-hidden />
      <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground tabular">
        {count}
      </span>
      <span className="sr-only">{count} record{count === 1 ? "" : "s"} waiting to sync</span>
    </span>
  );
}
