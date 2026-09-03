import type { Metadata } from "next";
import { Egg, LineChart, Skull, Wheat } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getAnalyticsData } from "@/lib/data/analytics";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { EggSizeDonut, LayingRateChart } from "@/components/charts/lazy";
import { RangePicker } from "@/components/reports/range-picker";
import { listRecentMonths, listRecentYears, resolveReportRange } from "@/lib/domain/reports";
import { farmToday, formatKg, formatNumber, formatPercent } from "@/lib/format";

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
  const data = await getAnalyticsData(context, range);
  const hasProduction = data.totals.totalEggs > 0 || data.totals.totalMortality > 0;

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Laying rate, egg sizes, and how your flocks compare."
        action={
          <RangePicker
            basePath="/analytics"
            value={range.value}
            months={listRecentMonths(today)}
            years={listRecentYears(today)}
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

            <Panel title="Eggs by size" className="lg:col-span-4 lg:self-start">
              <EggSizeDonut slices={data.charts.sizes} total={data.totals.totalEggs} />
            </Panel>
          </div>

          {data.flockComparison ? (
            <Panel title="Flock comparison">
              <p className="mb-3 text-sm text-muted-foreground">
                See which of your flocks is laying best, so you know where to focus.
              </p>
              {data.flockComparison.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active flocks to compare yet.</p>
              ) : (
                <div className="scroll-x">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <caption className="sr-only">Flock comparison: {range.label}</caption>
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th scope="col" className="py-2 text-left font-medium">Flock</th>
                        <th scope="col" className="py-2 text-right font-medium">Age</th>
                        <th scope="col" className="py-2 text-right font-medium">Eggs</th>
                        <th scope="col" className="py-2 text-right font-medium">Avg laying rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.flockComparison.map((flock) => (
                        <tr key={flock.id} className="border-b border-border last:border-0">
                          <th scope="row" className="py-2.5 text-left font-normal">
                            {flock.name}
                            {flock.breed && (
                              <span className="block text-xs text-muted-foreground">
                                {flock.breed}
                              </span>
                            )}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
