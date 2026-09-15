import type { Metadata } from "next";
import { GitCompare, PhilippinePeso, Receipt, TrendingUp } from "lucide-react";
import { getUserFarms, requireFarmContext } from "@/lib/auth/session";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getCrossFarmReportsData } from "@/lib/data/cross-farm-reports";
import { getFarmStartYear } from "@/lib/data/farms";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { FarmComparisonChart } from "@/components/charts/lazy";
import { ReportRangeSelect } from "@/components/reports/report-range-select";
import { listYearsSince, resolveReportRange } from "@/lib/domain/reports";
import { farmToday, formatCurrencyCompact, formatCurrencyShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Compare farms" };

export const dynamic = "force-dynamic";

export default async function CrossFarmReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "cross_farm_reporting")) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Compare farms"
          description="Revenue, cost, and profit side by side across every farm you run."
        />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "cross_farm_reporting")} />
      </PageShell>
    );
  }

  const today = farmToday(context.timezone);
  const { range: rangeParam } = await searchParams;
  // "Today" isn't offered in the picker anymore (report-range-select.tsx),
  // so a fresh visit with no ?range= should land on "This week", not the
  // single-day default resolveReportRange still falls back to for other
  // callers (sales-overview.ts, lib/export/route.ts).
  const range = resolveReportRange(rangeParam ?? "week", today);

  const [farms, startYear] = await Promise.all([
    getUserFarms(),
    // The active farm's own start year approximates "as far back as this
    // user could have anything to compare" -- exact per-farm start dates
    // aren't worth a second round trip just for the year picker's floor.
    getFarmStartYear(context.farmId),
  ]);

  if (farms.length < 2) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Compare farms"
          description="Revenue, cost, and profit side by side across every farm you run."
        />
        <EmptyState
          icon={GitCompare}
          title="Nothing to compare yet"
          message="Add a second farm and its numbers will show up here next to this one."
          actionLabel="Add a farm"
          actionHref="/farms"
        />
      </PageShell>
    );
  }

  const data = await getCrossFarmReportsData(
    farms.map((farm) => ({ farmId: farm.farmId, farmName: farm.farmName })),
    range
  );

  const rankedFarms = [...data.rows].sort((a, b) => b.profit - a.profit);
  const bestFarmId = rankedFarms[0]?.farmId;
  const worstFarmId = rankedFarms.length > 1 ? rankedFarms[rankedFarms.length - 1]?.farmId : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Compare farms"
        description="Revenue, cost, and profit side by side across every farm you run."
        action={
          <ReportRangeSelect
            basePath="/reports/cross-farm"
            value={range.value}
            years={listYearsSince(startYear, today)}
          />
        }
      />

      <section
        aria-label={`Combined totals: ${range.label}`}
        className="grid grid-cols-2 gap-3 xl:grid-cols-3"
      >
        <StatCard
          icon={PhilippinePeso}
          tint="teal"
          label="Combined revenue"
          value={formatCurrencyCompact(data.totals.revenue, context.currency)}
          sublabel={range.label}
        />
        <StatCard
          icon={Receipt}
          tint="rose"
          label="Combined cost"
          value={formatCurrencyCompact(data.totals.cost, context.currency)}
          sublabel="Feed and expenses"
        />
        <StatCard
          icon={TrendingUp}
          tint="violet"
          label="Combined profit"
          value={formatCurrencyCompact(data.totals.profit, context.currency)}
          sublabel="Estimated operating profit"
          className="col-span-2 xl:col-span-1"
        />
      </section>

      <Panel title="By farm">
        <div className="flex flex-col gap-4">
          <FarmComparisonChart data={data.rows} currency={context.currency} />

          <div className="scroll-x">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">Revenue, cost and profit by farm: {range.label}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 text-left font-medium">Farm</th>
                  <th scope="col" className="py-2 text-right font-medium">Revenue</th>
                  <th scope="col" className="py-2 text-right font-medium">Cost</th>
                  <th scope="col" className="py-2 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.farmId} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2.5 text-left font-normal">
                      <span className="flex items-center gap-2">
                        {row.farmName}
                        {row.farmId === bestFarmId && (
                          <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-medium text-good">
                            Top performer
                          </span>
                        )}
                        {row.farmId === worstFarmId && (
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
                    <td className="py-2.5 text-right tabular">
                      {formatCurrencyShort(row.revenue, context.currency)}
                    </td>
                    <td className="py-2.5 text-right tabular text-muted-foreground">
                      {formatCurrencyShort(row.cost, context.currency)}
                    </td>
                    <td className="py-2.5 text-right font-medium tabular">
                      {formatCurrencyShort(row.profit, context.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <p className="text-xs text-muted-foreground">
        Estimated operating profit is before depreciation, wages you draw yourself, and loan
        payments.
      </p>
    </PageShell>
  );
}
