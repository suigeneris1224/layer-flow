import type { Metadata } from "next";
import { Egg, LineChart, Skull, Wheat } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getAnalyticsData } from "@/lib/data/analytics";
import { getFarmStartYear } from "@/lib/data/farms";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import {
  EggSizeDonut,
  EggSizeTrendChart,
  FlockComparisonChart,
  LayingRateChart,
} from "@/components/charts/lazy";
import { ReportRangeSelect } from "@/components/reports/report-range-select";
import { listYearsSince, resolveReportRange } from "@/lib/domain/reports";
import { farmToday, formatCurrency, formatKg, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "production_charts")) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Analytics"
          description="Laying rate, egg sizes, and how your flocks compare."
        />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "production_charts")} />
      </PageShell>
    );
  }

  const today = farmToday(context.timezone);
  const { range: rangeParam } = await searchParams;
  const range = resolveReportRange(rangeParam, today);
  const [data, startYear] = await Promise.all([
    getAnalyticsData(context, range),
    getFarmStartYear(context.farmId),
  ]);
  const hasProduction = data.totals.totalEggs > 0 || data.totals.totalMortality > 0;

  const flockComparison = data.flockComparison ?? [];
  const bestFlockId = flockComparison[0]?.id;
  const worstFlockId =
    flockComparison.length > 1 ? flockComparison[flockComparison.length - 1]?.id : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Laying rate, egg sizes, and how your flocks compare."
        action={
          <ReportRangeSelect
            basePath="/analytics"
            value={range.value}
            years={listYearsSince(startYear, today)}
          />
        }
      />

      {!hasProduction ? (
        <EmptyState
          icon={LineChart}
          title="No production recorded in this period"
          message="Record a few days of production and your trends will show up here."
        />
      ) : (
        <>
          <section aria-label={`Summary: ${range.label}`} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              icon={Egg}
              tint="amber"
              label="Total eggs"
              value={formatNumber(data.totals.totalEggs)}
              sublabel={range.label}
            />
            <StatCard
              icon={LineChart}
              tint="green"
              label="Avg laying rate"
              info="The share of hens that laid an egg that day, averaged across this period. Higher means your flock is producing more consistently."
              value={formatPercent(data.totals.avgLayingRate)}
              sublabel={range.label}
            />
            <StatCard
              icon={Wheat}
              tint="teal"
              label="Avg feed per hen"
              info="Total feed given divided by the number of hens on hand, averaged per day over this period. Watch this alongside laying rate — feed use climbing while laying rate falls can be an early warning sign."
              value={formatKg(data.totals.avgFeedPerHen)}
              sublabel="Per hen, per day"
            />
            <StatCard
              icon={Skull}
              tint="rose"
              label="Birds lost"
              value={formatNumber(data.totals.totalMortality)}
              sublabel={range.label}
            />
          </section>

          <p className="text-xs text-muted-foreground">
            Laying rate is the share of hens that laid an egg that day — the higher, the better
            your flock is producing.
          </p>

          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            <Panel title="Laying rate" className="lg:col-span-8">
              <LayingRateChart data={data.charts.layingRate} />
            </Panel>

            {data.charts.sizes && data.charts.sizeTrend ? (
              <Panel title="Eggs by size" className="lg:col-span-4 lg:self-start">
                <div className="flex flex-col gap-5">
                  <EggSizeDonut slices={data.charts.sizes} total={data.totals.totalEggs} />

                  <div className="border-t border-border pt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Mix over {range.label.toLowerCase()}
                    </p>
                    <EggSizeTrendChart
                      points={data.charts.sizeTrend.points}
                      sizes={data.charts.sizeTrend.sizes}
                    />
                  </div>
                </div>
              </Panel>
            ) : (
              <UpgradePanel
                className="lg:col-span-4"
                prompt={featureLockedPrompt(entitlement, "egg_size_analytics")}
              />
            )}
          </div>

          {data.flockComparison ? (
            <Panel title="Flock comparison">
              <p className="mb-3 text-sm text-muted-foreground">
                See which of your flocks is laying best, so you know where to focus.
              </p>
              {flockComparison.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active flocks to compare yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <FlockComparisonChart data={flockComparison} />

                  <div className="scroll-x">
                    <table className="w-full min-w-[44rem] border-collapse text-sm">
                      <caption className="sr-only">Flock comparison: {range.label}</caption>
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th scope="col" className="py-2 text-left font-medium">Flock</th>
                          <th scope="col" className="py-2 text-right font-medium">Age</th>
                          <th scope="col" className="py-2 text-right font-medium">Eggs</th>
                          <th scope="col" className="py-2 text-right font-medium">Avg laying rate</th>
                          <th scope="col" className="py-2 text-right font-medium">Feed conversion</th>
                          <th scope="col" className="py-2 text-right font-medium">Cost / egg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flockComparison.map((flock) => (
                          <tr key={flock.id} className="border-b border-border last:border-0">
                            <th scope="row" className="py-2.5 text-left font-normal">
                              <span className="flex items-center gap-2">
                                <span>
                                  {flock.name}
                                  {flock.breed && (
                                    <span className="block text-xs text-muted-foreground">
                                      {flock.breed}
                                    </span>
                                  )}
                                </span>
                                {flock.id === bestFlockId && (
                                  <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-medium text-good">
                                    Top performer
                                  </span>
                                )}
                                {flock.id === worstFlockId && (
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                      "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]"
                                    )}
                                  >
                                    Needs attention
                                  </span>
                                )}
                              </span>
                            </th>
                            <td className="py-2.5 text-right text-muted-foreground">
                              {flock.ageWeeks} wk
                            </td>
                            <td className="py-2.5 text-right tabular">
                              {formatNumber(flock.totalEggs)}
                            </td>
                            <td className="py-2.5 text-right font-medium tabular">
                              {formatPercent(flock.avgLayingRate)}
                            </td>
                            <td className="py-2.5 text-right tabular text-muted-foreground">
                              {flock.feedConversion > 0 ? `${formatKg(flock.feedConversion)}/egg` : "—"}
                            </td>
                            <td className="py-2.5 text-right tabular text-muted-foreground">
                              {flock.costPerEgg > 0
                                ? `${formatCurrency(flock.costPerEgg, context.currency)}/egg`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Panel>
          ) : (
            <UpgradePanel prompt={featureLockedPrompt(entitlement, "flock_comparison")} />
          )}
        </>
      )}
    </PageShell>
  );
}
