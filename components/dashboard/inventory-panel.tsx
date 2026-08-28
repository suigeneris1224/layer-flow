import Link from "next/link";
import { Boxes } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InventoryLine } from "@/lib/data/dashboard";

/**
 * Eggs on hand by size.
 *
 * Trays are counted per size, not by dividing the farm total: farmers grade
 * into same-size trays, so loose eggs of different sizes are not a tray anyone
 * can sell. Negative balances are shown, never clamped -- see
 * lib/domain/inventory.ts.
 */
export function InventoryPanel({
  lines,
  totalEggs,
  totalTrays,
  hasNegative,
  ungradedEggs,
  className,
}: {
  lines: InventoryLine[];
  totalEggs: number;
  totalTrays: number;
  hasNegative: boolean;
  ungradedEggs: number;
  className?: string;
}) {
  const largest = Math.max(...lines.map((line) => Math.max(0, line.eggsAvailable)), 1);

  return (
    <Panel
      title="Egg inventory"
      className={className}
      action={
        <Link href="/inventory" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      }
    >
      {lines.length === 0 || totalEggs === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No eggs in stock yet"
          message="Record production with egg sizes filled in and your inventory builds up here."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li key={line.eggSizeId} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-sm">{line.name}</span>

                {/* Decorative: the number beside it carries the meaning. */}
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(Math.max(0, line.eggsAvailable) / largest) * 100}%` }}
                  />
                </span>

                <span
                  className={cn(
                    "w-16 shrink-0 text-right text-sm font-medium tabular",
                    line.eggsAvailable < 0 && "text-destructive"
                  )}
                >
                  {formatNumber(line.eggsAvailable)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular">
              {formatNumber(totalEggs)} eggs
              <span className="ml-2 font-normal text-muted-foreground">
                {formatNumber(totalTrays)} trays
              </span>
            </span>
          </div>
        </>
      )}

      {hasNegative && (
        <div className="mt-3">
          <StatusNote tone="bad" title="A size has gone below zero">
            More eggs sold than recorded as collected. Check the production records, or adjust the
            count.
          </StatusNote>
        </div>
      )}

      {ungradedEggs > 0 && (
        <div className="mt-3">
          <StatusNote tone="warn" title={`${formatNumber(ungradedEggs)} eggs not sorted yet`}>
            These aren&apos;t counted above. Fill in the egg sizes on the day&apos;s record to add
            them.
          </StatusNote>
        </div>
      )}
    </Panel>
  );
}
