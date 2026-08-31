import type { Metadata } from "next";
import { BarChart3, PhilippinePeso, Receipt, TrendingUp } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getReportsData } from "@/lib/data/reports";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { ProfitChart } from "@/components/charts/lazy";
import { RangePicker } from "@/components/reports/range-picker";
import { listRecentMonths, listRecentYears, resolveReportRange } from "@/lib/domain/reports";
import {
  farmToday,
  formatCurrency,
  formatCurrencyShort,
  formatDateShort,
  formatPercent,
} from "@/lib/format";
import { Delta } from "@/components/ui/delta";

export const metadata: Metadata = { title: "Reports" };

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "reports")) {
    return (
      <PageShell width="reading">
        <PageHeader title="Reports" description="Revenue, cost, and estimated profit over time." />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "reports")} />
      </PageShell>
    );
  }

  const today = farmToday(context.timezone);
  const { range: rangeParam } = await searchParams;
  const range = resolveReportRange(rangeParam, today);
  const data = await getReportsData(context, range);
  const hasMoney = data.totals.revenue > 0 || data.totals.cost > 0;

  return (
    <PageShell>
      <PageHeader
        title="Reports"
        description="Revenue, cost, and estimated profit over time."
        action={
          <RangePicker
            basePath="/reports"
            value={range.value}
            months={listRecentMonths(today)}
            years={listRecentYears(today)}
          />
        }
      />

      {!hasMoney ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing to report yet"
          message="Record a sale or an expense and your revenue, cost, and profit will show up here."
        />
      ) : (
        <>
          <section aria-label={`Summary: ${range.label}`} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              icon={PhilippinePeso}
              tint="teal"
              label="Revenue"
              value={formatCurrencyShort(data.totals.revenue, context.currency)}
              sublabel={range.label}
              delta={data.deltas.revenue}
              deltaLabel="vs previous period"
            />
            <StatCard
              icon={Receipt}
              tint="rose"
              label="Cost"
              value={formatCurrencyShort(data.totals.cost, context.currency)}
              sublabel="Feed and expenses"
              delta={data.deltas.cost}
              deltaLabel="vs previous period"
              goodWhenUp={false}
            />
            <StatCard
              icon={TrendingUp}
              tint="violet"
              label="Est. profit"
              value={formatCurrencyShort(data.totals.profit, context.currency)}
              sublabel="Estimated operating profit"
              delta={data.deltas.profit}
              deltaLabel="vs previous period"
            />
            <StatCard
              icon={BarChart3}
              tint="green"
              label="Profit margin"
              value={data.totals.margin === null ? "—" : formatPercent(data.totals.margin)}
              sublabel="Of revenue"
            />
          </section>

          <Panel title="Revenue & cost">
            <ProfitChart data={data.chart} currency={context.currency} />
          </Panel>

          {/*
            Year-on-year, which the "vs previous period" deltas above cannot
            express. Egg production is seasonal, so the same weeks last year is
            often the only fair comparison. Absent entirely when the farm has
            no records that far back, rather than showing a wall of -100%.
          */}
          {data.lastYear && (
            <Panel
              title="Same period last year"
              action={
                <span className="text-xs text-muted-foreground">
                  {formatDateShort(data.lastYear.from, context.timezone)} –{" "}
                  {formatDateShort(data.lastYear.to, context.timezone)}
                </span>
              }
            >
              <dl className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Revenue",
                    then: data.lastYear.revenue,
                    delta: data.lastYear.deltas.revenue,
                    goodWhenUp: true,
                  },
                  {
                    label: "Cost",
                    then: data.lastYear.cost,
                    delta: data.lastYear.deltas.cost,
                    goodWhenUp: false,
                  },
                  {
                    label: "Est. profit",
                    then: data.lastYear.profit,
                    delta: data.lastYear.deltas.profit,
                    goodWhenUp: true,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">
                      {row.label} last year
                    </dt>
                    <dd className="text-lg font-semibold tabular">
                      {formatCurrencyShort(row.then, context.currency)}
                    </dd>
                    <Delta
                      value={row.delta}
                      label="this period vs last year"
                      goodWhenUp={row.goodWhenUp}
                    />
                  </div>
                ))}
              </dl>
            </Panel>
          )}

          {data.flockProfitability ? (
            <Panel title="Profitability by flock">
              {data.flockProfitability.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No revenue or cost attributed to a flock in this period yet.
                </p>
              ) : (
                <div className="scroll-x">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <caption className="sr-only">Profitability by flock: {range.label}</caption>
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th scope="col" className="py-2 text-left font-medium">Flock</th>
                        <th scope="col" className="py-2 text-right font-medium">Revenue</th>
                        <th scope="col" className="py-2 text-right font-medium">Cost</th>
                        <th scope="col" className="py-2 text-right font-medium">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.flockProfitability.map((flock) => (
                        <tr key={flock.id} className="border-b border-border last:border-0">
                          <th scope="row" className="py-2.5 text-left font-normal">
                            {flock.name}
                          </th>
                          <td className="py-2.5 text-right tabular">
                            {formatCurrency(flock.revenue, context.currency)}
                          </td>
                          <td className="py-2.5 text-right tabular text-muted-foreground">
                            {formatCurrency(flock.cost, context.currency)}
                          </td>
                          <td className="py-2.5 text-right font-medium tabular">
                            {formatCurrency(flock.profit, context.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          ) : (
            <UpgradePanel prompt={featureLockedPrompt(entitlement, "advanced_reports")} />
          )}

          <p className="text-xs text-muted-foreground">
            Estimated operating profit is before depreciation, wages you draw yourself, and loan
            payments.
          </p>
        </>
      )}
    </PageShell>
  );
}
