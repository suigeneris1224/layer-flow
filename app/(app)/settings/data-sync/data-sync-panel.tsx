"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, CloudOff, Download, RotateCw } from "lucide-react";
import { useConnectivity } from "@/lib/offline/use-connectivity";
import { listPending, retryFailed } from "@/lib/offline/queue";
import { onQueueChange } from "@/lib/offline/events";
import { drainQueue } from "@/lib/offline/sync";
import type { PendingWrite } from "@/lib/offline/db";
import { Panel } from "@/components/ui/panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";
import { ConflictReviewModal } from "@/components/offline/conflict-review-modal";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<PendingWrite["kind"], string> = {
  daily_production: "Production record",
  mortality: "Mortality record",
  feed_usage: "Feed record",
};

/**
 * Unlike components/offline/offline-status.tsx (which renders nothing when
 * idle), this page always shows the current state -- it's the one place a
 * farmer can come to check "is my data safe?" even when nothing is wrong.
 */
export function DataSyncPanel({ offlineEnabled }: { offlineEnabled: boolean }) {
  const online = useConnectivity();
  const [items, setItems] = useState<PendingWrite[]>([]);
  const [syncingNow, setSyncingNow] = useState(false);
  const [reviewing, setReviewing] = useState<PendingWrite | null>(null);

  const refresh = useCallback(async () => {
    setItems(await listPending());
  }, []);

  useEffect(() => {
    refresh();
    return onQueueChange(refresh);
  }, [refresh]);

  const syncing = items.some((item) => item.status === "syncing");
  const failed = items.filter((item) => item.status === "failed");
  const conflicts = items.filter((item) => item.status === "conflict");
  const waiting = items.filter((item) => item.status === "pending");

  const newestAttempt = items
    .map((item) => item.lastAttemptAt)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => b - a)[0];

  async function syncNow() {
    setSyncingNow(true);
    await drainQueue();
    setSyncingNow(false);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
        <Panel title="Connection">
          <div className="flex items-center gap-3">
            {online ? (
              <Cloud className="size-5 shrink-0 text-[hsl(var(--status-good))]" aria-hidden />
            ) : (
              <CloudOff className="size-5 shrink-0 text-[hsl(var(--status-warn))]" aria-hidden />
            )}
            <div>
              <p className="font-medium">{online ? "Online" : "Offline"}</p>
              <p className="text-sm text-muted-foreground">
                {online
                  ? "Records you save go straight to the server."
                  : "Records you save are kept on this phone until you're back online."}
              </p>
            </div>
          </div>

          {!offlineEnabled && (
            <p className="mt-3 text-xs text-muted-foreground">
              Offline mode isn&apos;t part of your plan. Anything already saved on this phone will
              still sync once you tap &quot;Sync now&quot; below.
            </p>
          )}
        </Panel>

        <Panel title="Export data">
          <p className="text-sm text-muted-foreground">
            Download your records as a spreadsheet from Expenses or Sales History.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/expenses" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Download className="size-4" aria-hidden />
              Export expenses
            </Link>
            <Link href="/sales" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Download className="size-4" aria-hidden />
              Export sales
            </Link>
          </div>
        </Panel>
      </div>

      <Panel
        title="Pending changes"
        action={
          <Button size="sm" variant="outline" loading={syncingNow} onClick={syncNow}>
            <RotateCw className="size-4" aria-hidden />
            Sync now
          </Button>
        }
      >
        {items.length === 0 ? (
          <StatusNote tone="good">All changes synced.</StatusNote>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {waiting.length > 0 && `${waiting.length} waiting to sync. `}
              {syncing && "Syncing now. "}
              {failed.length > 0 &&
                `${failed.length} couldn't sync. `}
              {conflicts.length > 0 &&
                `${conflicts.length} need${conflicts.length === 1 ? "s" : ""} your review.`}
              {newestAttempt &&
                ` Last attempt: ${new Date(newestAttempt).toLocaleString()}.`}
            </p>

            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{KIND_LABEL[item.kind]}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.status === "syncing" && "Syncing…"}
                      {item.status === "pending" && "Waiting to sync"}
                      {item.status === "failed" && (item.lastError || "Couldn't sync")}
                      {item.status === "conflict" &&
                        "Someone else saved different numbers for this day."}
                    </p>
                  </div>

                  {item.status === "conflict" && (
                    <Button size="sm" variant="outline" onClick={() => setReviewing(item)}>
                      Review
                    </Button>
                  )}
                  {item.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await retryFailed(item.id);
                        void drainQueue();
                      }}
                    >
                      <RotateCw className="size-3.5" aria-hidden />
                      Retry
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {reviewing && (
        <ConflictReviewModal item={reviewing} onClose={() => setReviewing(null)} />
      )}
    </>
  );
}
