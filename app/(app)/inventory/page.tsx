import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canAdjustInventory } from "@/lib/auth/permissions";
import { getInventoryData } from "@/lib/data/inventory";
import { reasonLabel } from "@/lib/domain/inventory";
import { Panel } from "@/components/ui/panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { farmToday, formatNumber, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdjustForm } from "./adjust-form";

export const metadata: Metadata = { title: "Egg inventory" };

export const dynamic = "force-dynamic";

/** Split a stored "REASON: note" string back into its parts for display. */
function describeReason(stored: string): string {
  const [code, ...rest] = stored.split(":");
  const label = reasonLabel(code.trim());
  const note = rest.join(":").trim();
  return note ? `${label} — ${note}` : label;
}

export default async function InventoryPage() {
  const context = await requireFarmContext();
  const { summary, ungradedEggs, recentAdjustments } = await getInventoryData(context);
  const canAdjust = canAdjustInventory(context);

  return (
    <PageShell>
      <PageHeader
        title="Egg inventory"
        description="What you have on hand, by size. Counted from graded eggs, minus what you've sold."
      />

      {summary.hasNegative && (
        <StatusNote tone="bad" title="A size has gone below zero">
          More eggs have been sold than recorded as collected. Check the production records for
          missing days, or record an adjustment below to correct the count.
        </StatusNote>
      )}

      {ungradedEggs > 0 && (
        <StatusNote tone="warn" title={`${formatNumber(ungradedEggs)} eggs not sorted yet`}>
          Collected but not yet assigned to a size, so they aren&apos;t counted here.{" "}
          <Link href="/production" className="font-medium underline underline-offset-2">
            See which days need sorting
          </Link>{" "}
          — flagged days show an &quot;unsorted&quot; count. Open one and fill in the egg sizes
          to add it here.
        </StatusNote>
      )}

      {summary.lines.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nothing in stock yet"
          message="Record production with the egg sizes filled in, and your inventory builds up here."
          actionLabel="Record production"
          actionHref="/production/new"
        />
      ) : (
        <Panel
          title="On hand"
          action={
            <span className="text-xs text-muted-foreground tabular">
              {formatNumber(summary.totalTrays)} trays
              {summary.looseEggs > 0 && ` + ${formatNumber(summary.looseEggs)} eggs`}
            </span>
          }
        >
          <>
            {/* Wide on a narrow phone: the table scrolls, never the page. */}
            <div className="scroll-x">
              <table className="w-full min-w-[30rem] border-collapse text-sm">
                <caption className="sr-only">Eggs available by size</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-2 text-left font-medium">Size</th>
                    <th scope="col" className="py-2 text-right font-medium">Produced</th>
                    <th scope="col" className="py-2 text-right font-medium">Sold</th>
                    <th scope="col" className="py-2 text-right font-medium">Adjusted</th>
                    <th scope="col" className="py-2 text-right font-medium">Available</th>
                    <th scope="col" className="py-2 text-right font-medium">Trays</th>
                  </tr>
                </thead>

                <tbody>
                  {summary.lines.map((line) => (
                    <tr key={line.eggSizeId} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2.5 text-left font-normal">{line.name}</th>
                      <td className="py-2.5 text-right tabular">{formatNumber(line.eggsProduced)}</td>
                      <td className="py-2.5 text-right tabular text-muted-foreground">
                        {formatNumber(line.eggsSold)}
                      </td>
                      <td className="py-2.5 text-right tabular text-muted-foreground">
                        {line.eggsAdjusted === 0 ? "—" : formatNumber(line.eggsAdjusted)}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-semibold tabular",
                          line.eggsAvailable < 0 && "text-destructive"
                        )}
                      >
                        {formatNumber(line.eggsAvailable)}
                      </td>
                      <td className="py-2.5 text-right tabular text-muted-foreground">
                        {line.trays}
                        {line.looseEggs > 0 && ` + ${line.looseEggs}`}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="border-t-2 border-border font-semibold">
                    <th scope="row" className="py-2.5 text-left">Total</th>
                    <td colSpan={3} />
                    <td
                      className={cn(
                        "py-2.5 text-right tabular",
                        summary.totalEggs < 0 && "text-destructive"
                      )}
                    >
                      {formatNumber(summary.totalEggs)}
                    </td>
                    <td className="py-2.5 text-right tabular">{summary.totalTrays}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Trays are counted per size — loose eggs of different sizes don&apos;t make a tray you
              can sell.
            </p>
          </>
        </Panel>
      )}

      {canAdjust ? (
        <AdjustForm
          sizes={summary.lines.map((line) => ({
            eggSizeId: line.eggSizeId,
            name: line.name,
            eggsAvailable: line.eggsAvailable,
          }))}
          today={farmToday(context.timezone)}
        />
      ) : (
        <StatusNote tone="info">
          Only the farm owner or a manager can change stock counts.
        </StatusNote>
      )}

      {recentAdjustments.length > 0 && (
        <Panel title="Recent adjustments">
            <ul className="flex flex-col divide-y divide-border">
              {recentAdjustments.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.sizeName}</span>{" "}
                      <span className="text-muted-foreground">{describeReason(entry.reason)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDay(entry.adjustmentDate, context.timezone)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium tabular",
                      entry.quantityEggs < 0 ? "text-destructive" : "text-primary"
                    )}
                  >
                    {entry.quantityEggs > 0 ? "+" : ""}
                    {formatNumber(entry.quantityEggs)}
                  </span>
                </li>
              ))}
            </ul>
        </Panel>
      )}
    </PageShell>
  );
}
