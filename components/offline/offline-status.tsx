"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, Loader2, RotateCw } from "lucide-react";
import { useConnectivity } from "@/lib/offline/use-connectivity";
import { listPending, retryFailed } from "@/lib/offline/queue";
import { onQueueChange } from "@/lib/offline/events";
import { drainQueue } from "@/lib/offline/sync";
import type { PendingWrite } from "@/lib/offline/db";
import { cn } from "@/lib/utils";
import { ConflictReviewModal } from "@/components/offline/conflict-review-modal";

const KIND_LABEL: Record<PendingWrite["kind"], string> = {
  daily_production: "Production record",
  mortality: "Mortality record",
  feed_usage: "Feed record",
};

/**
 * The one place the offline queue's state (docs/offline-sync.md's "What the
 * farmer sees" table) is visible -- mounted once in app/(app)/layout.tsx.
 *
 * Renders nothing when there's nothing to say: online, empty queue. There is
 * no existing toast/transient-message component in this codebase (StatusNote
 * is inline/persistent, not ephemeral), so this is a small bespoke banner
 * built from the same status tone tokens as components/dashboard/today-status.tsx.
 */
export function OfflineStatus({ offlineEnabled }: { offlineEnabled: boolean }) {
  const online = useConnectivity();
  const [items, setItems] = useState<PendingWrite[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [reviewing, setReviewing] = useState<PendingWrite | null>(null);
  const hadPending = useRef(false);

  const refresh = useCallback(async () => {
    const pending = await listPending();
    setItems(pending);

    if (hadPending.current && pending.length === 0) {
      setJustSynced(true);
      window.setTimeout(() => setJustSynced(false), 4000);
    }
    hadPending.current = pending.length > 0;
  }, []);

  useEffect(() => {
    refresh();
    return onQueueChange(refresh);
  }, [refresh]);

  /*
   * Sync triggers: regaining connectivity, the tab regaining focus, and a
   * gentle periodic check in case neither fires (some mobile browsers are
   * unreliable about the `online` event). None of these fire automatically
   * for a farm no longer entitled to offline_mode -- a downgraded plan must
   * never silently keep pushing writes in the background. What's already
   * queued still exists and is still shown; it just waits for the farmer to
   * tap "Sync now" below instead.
   */
  useEffect(() => {
    if (online && offlineEnabled) void drainQueue();
  }, [online, offlineEnabled]);

  useEffect(() => {
    if (!offlineEnabled) return;

    function onFocus() {
      void drainQueue();
    }
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => void drainQueue(), 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [offlineEnabled]);

  const syncing = items.some((item) => item.status === "syncing");
  const failed = items.filter((item) => item.status === "failed");
  const conflicts = items.filter((item) => item.status === "conflict");
  const waiting = items.filter((item) => item.status === "pending").length;

  if (!online) {
    return (
      <Banner tone="warn" icon={CloudOff}>
        Offline — your records are saved on this phone.
        {items.length > 0 && ` (${items.length} waiting to sync.)`}
      </Banner>
    );
  }

  if (!offlineEnabled && items.length > 0) {
    return (
      <div className="border-b border-border bg-[hsl(var(--status-warn))]/10">
        <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-3 px-4 py-2 text-center text-sm font-medium text-[hsl(var(--status-warn))]">
          <span>
            Offline mode isn&apos;t part of your plan. {items.length}{" "}
            {items.length === 1 ? "record" : "records"} saved earlier still need to sync.
          </span>
          <button
            type="button"
            onClick={() => void drainQueue()}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RotateCw className="size-3.5" aria-hidden />
            Sync now
          </button>
        </div>
      </div>
    );
  }

  if (failed.length + conflicts.length > 0) {
    const failedLabel =
      failed.length > 0
        ? `Couldn't sync ${failed.length} ${failed.length === 1 ? "record" : "records"}.`
        : "";
    const conflictLabel =
      conflicts.length > 0
        ? `${conflicts.length} need${conflicts.length === 1 ? "s" : ""} your review.`
        : "";

    return (
      <div className="border-b border-border bg-[hsl(var(--status-bad))]/10">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-[hsl(var(--status-bad))]"
        >
          {[failedLabel, conflictLabel].filter(Boolean).join(" ")} Tap to review.
        </button>

        {expanded && (
          <ul className="mx-auto flex max-w-md flex-col gap-2 px-4 pb-3">
            {[...failed, ...conflicts].map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{KIND_LABEL[item.kind]}</p>
                  {item.status === "failed" && item.lastError && (
                    <p className="truncate text-xs text-muted-foreground">{item.lastError}</p>
                  )}
                  {item.status === "conflict" && (
                    <p className="truncate text-xs text-muted-foreground">
                      Someone else saved different numbers for this day.
                    </p>
                  )}
                </div>

                {item.status === "conflict" ? (
                  <button
                    type="button"
                    onClick={() => setReviewing(item)}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Review
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await retryFailed(item.id);
                      void drainQueue();
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <RotateCw className="size-3.5" aria-hidden />
                    Retry
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {reviewing && (
          <ConflictReviewModal item={reviewing} onClose={() => setReviewing(null)} />
        )}
      </div>
    );
  }

  if (syncing || waiting > 0) {
    return (
      <Banner tone="warn" icon={Loader2} spin>
        Syncing{waiting > 0 ? ` ${waiting}` : ""}…
      </Banner>
    );
  }

  if (justSynced) {
    return (
      <Banner tone="good" icon={Cloud}>
        Records synchronized.
      </Banner>
    );
  }

  return null;
}

function Banner({
  tone,
  icon: Icon,
  spin,
  children,
}: {
  tone: "good" | "warn" | "bad";
  icon: typeof Cloud;
  spin?: boolean;
  children: React.ReactNode;
}) {
  const TONE = {
    good: "bg-[hsl(var(--status-good))]/10 text-[hsl(var(--status-good))]",
    warn: "bg-[hsl(var(--status-warn))]/10 text-[hsl(var(--status-warn))]",
    bad: "bg-[hsl(var(--status-bad))]/10 text-[hsl(var(--status-bad))]",
  } as const;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 border-b border-border px-4 py-2 text-center text-sm font-medium",
        TONE[tone]
      )}
    >
      <Icon className={cn("size-4 shrink-0", spin && "animate-spin")} aria-hidden />
      {children}
    </div>
  );
}
