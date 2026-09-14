"use client";

import { useCallback, useEffect, useState } from "react";
import { pendingCount } from "@/lib/offline/queue";
import { onQueueChange } from "@/lib/offline/events";

/**
 * A compact inline count, for the Data & Sync row in the settings nav
 * (components/nav/settings-nav.tsx). Same live-count plumbing as
 * components/offline/pending-count-badge.tsx's topbar badge, just a small
 * pill instead of that component's 44px icon square -- a nav list row needs
 * a different shape, not a second icon.
 */
export function PendingSyncPill() {
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
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-5 text-destructive-foreground tabular">
      {count}
      <span className="sr-only"> record{count === 1 ? "" : "s"} waiting to sync</span>
    </span>
  );
}
