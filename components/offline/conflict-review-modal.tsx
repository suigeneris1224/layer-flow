"use client";

import { useEffect, useRef, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { recordProductionAction } from "@/app/(app)/production/actions";
import { discardConflict, markSynced } from "@/lib/offline/queue";
import type { PendingWrite } from "@/lib/offline/db";
import type { DailyProductionInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";

/**
 * Both versions of a daily-production write that disagree, side by side.
 *
 * Modelled on components/nav/mobile-drawer.tsx's bespoke dialog pattern --
 * there is no generic Dialog primitive in this codebase yet.
 */
export function ConflictReviewModal({
  item,
  onClose,
}: {
  item: PendingWrite;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!item.conflict) return null;

  const mine = item.payload as DailyProductionInput;
  const server = item.conflict.server;

  const rows: { label: string; mine: string | number; server: string | number }[] = [
    { label: "Hens present", mine: mine.hensPresent, server: server.hensPresent },
    { label: "Eggs collected", mine: mine.eggsCollected, server: server.eggsCollected },
    { label: "Broken eggs", mine: mine.brokenEggs, server: server.brokenEggs },
    { label: "Dirty eggs", mine: mine.dirtyEggs, server: server.dirtyEggs },
    { label: "Mortality", mine: mine.mortality, server: server.mortality },
    {
      label: "Avg egg weight",
      mine: mine.averageEggWeight === "" || mine.averageEggWeight === undefined
        ? "—"
        : mine.averageEggWeight,
      server: server.averageEggWeight ?? "—",
    },
    { label: "Notes", mine: mine.notes || "—", server: server.notes || "—" },
  ];

  const sizeIds = new Set([
    ...mine.sizes.map((size) => size.eggSizeId),
    ...Object.keys(server.sizes),
  ]);
  for (const eggSizeId of sizeIds) {
    const mineQty = mine.sizes.find((size) => size.eggSizeId === eggSizeId)?.quantity ?? 0;
    rows.push({
      label: `Size ${eggSizeId.slice(0, 8)}`,
      mine: mineQty,
      server: server.sizes[eggSizeId] ?? 0,
    });
  }

  function keepMine() {
    startTransition(async () => {
      const result = await recordProductionAction(item.payload);
      if (result.ok) {
        await markSynced(item.id);
        router.refresh();
      }
      onClose();
    });
  }

  function keepServer() {
    startTransition(async () => {
      await discardConflict(item.id);
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review conflicting record"
      className="fixed inset-0 z-50 flex items-end justify-center lg:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/40" />

      <div
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-xl bg-surface p-4 shadow-pop lg:max-w-lg lg:rounded-xl lg:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Two versions of this record</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mine.productionDate} — someone else saved different numbers for this flock-day
              while you were offline. Pick which one to keep.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="mt-4 scroll-x">
          <table className="w-full min-w-[24rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-2 text-left font-medium">Field</th>
                <th scope="col" className="py-2 text-right font-medium">Yours (offline)</th>
                <th scope="col" className="py-2 text-right font-medium">Server</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                    {row.label}
                  </th>
                  <td className="py-2 text-right tabular">{row.mine}</td>
                  <td className="py-2 text-right tabular">{row.server}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <Button variant="outline" block loading={pending} onClick={keepServer}>
            Keep server&apos;s version
          </Button>
          <Button block loading={pending} onClick={keepMine}>
            Keep mine, overwrite
          </Button>
        </div>
      </div>
    </div>
  );
}
