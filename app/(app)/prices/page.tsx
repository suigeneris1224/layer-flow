import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManagePricing } from "@/lib/auth/permissions";
import { getCurrentPrices, getPriceHistory } from "@/lib/data/pricing";
import { classifyPrice, impliedPricePerEgg } from "@/lib/domain/pricing";
import { Panel } from "@/components/ui/panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { farmToday, formatCurrency, formatDate } from "@/lib/format";
import { PriceForm } from "./price-form";

export const metadata: Metadata = { title: "Egg prices" };

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const context = await requireFarmContext();
  const today = farmToday(context.timezone);

  const [sizes, history] = await Promise.all([
    getCurrentPrices(context.farmId, today),
    getPriceHistory(context),
  ]);

  const canEdit = canManagePricing(context);
  const unpriced = sizes.filter((size) => size.currentPrice === null);

  // Three buckets, not two: a price starting tomorrow is neither current nor
  // history, and would otherwise be invisible after the farmer schedules it.
  const scheduled = history.filter((entry) => classifyPrice(entry, today) === "scheduled");
  const past = history.filter((entry) => classifyPrice(entry, today) === "previous");

  return (
    <PageShell>
      <PageHeader
        title="Egg prices"
        description="What you charge per size. Past sales keep the price you used that day."
      />

      {unpriced.length > 0 && (
        <StatusNote tone="warn" title="Some sizes have no price">
          {unpriced.map((size) => size.name).join(", ")} — set a price so sales can be recorded
          against them.
        </StatusNote>
      )}

      {sizes.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No egg sizes yet"
          message="Egg sizes are created when you set up your farm."
        />
      ) : (
        <Panel title="Current prices">
            <div className="scroll-x">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <caption className="sr-only">Current price for each egg size</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-2 text-left font-medium">Size</th>
                    <th scope="col" className="py-2 text-right font-medium">Per tray</th>
                    <th scope="col" className="py-2 text-right font-medium">Per egg</th>
                    <th scope="col" className="py-2 text-right font-medium">Since</th>
                  </tr>
                </thead>

                <tbody>
                  {sizes.map((size) => (
                    <tr key={size.eggSizeId} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2.5 text-left font-normal">{size.name}</th>

                      {size.currentPrice ? (
                        <>
                          <td className="py-2.5 text-right font-semibold tabular">
                            {formatCurrency(size.currentPrice.pricePerTray, context.currency)}
                          </td>
                          <td className="py-2.5 text-right tabular">
                            {formatCurrency(size.currentPrice.pricePerEgg, context.currency)}
                            <span className="ml-1 text-xs text-muted-foreground">
                              (tray ≈{" "}
                              {formatCurrency(
                                impliedPricePerEgg(size.currentPrice.pricePerTray),
                                context.currency
                              )}
                              )
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-xs text-muted-foreground">
                            {formatDate(size.currentPrice.effectiveFrom, context.timezone)}
                          </td>
                        </>
                      ) : (
                        <td colSpan={3} className="py-2.5 text-right text-muted-foreground">
                          Not priced yet
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </Panel>
      )}

      {canEdit ? (
        <PriceForm
          sizes={sizes.map((size) => ({
            eggSizeId: size.eggSizeId,
            name: size.name,
            currentPrice: size.currentPrice,
          }))}
          today={today}
          currency={context.currency}
        />
      ) : (
        <StatusNote tone="info">
          Only the farm owner or a manager can change prices.
        </StatusNote>
      )}

      {scheduled.length > 0 && (
        <Panel title="Scheduled changes">
            <ul className="flex flex-col divide-y divide-border">
              {scheduled.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.sizeName}</p>
                    <p className="text-xs text-muted-foreground">
                      Starts {formatDate(entry.effectiveFrom, context.timezone)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular text-primary">
                    {formatCurrency(entry.pricePerTray, context.currency)} a tray
                  </span>
                </li>
              ))}
            </ul>
        </Panel>
      )}

      {past.length > 0 && (
        <Panel title="Previous prices">
            <ul className="flex flex-col divide-y divide-border">
              {past.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.sizeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.effectiveFrom, context.timezone)} –{" "}
                      {entry.effectiveTo
                        ? formatDate(entry.effectiveTo, context.timezone)
                        : "now"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular text-muted-foreground">
                    {formatCurrency(entry.pricePerTray, context.currency)} a tray
                  </span>
                </li>
              ))}
            </ul>
        </Panel>
      )}
    </PageShell>
  );
}
