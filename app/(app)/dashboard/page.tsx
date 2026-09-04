import type { Metadata } from "next";
import Link from "next/link";
import { Bird, Egg, PhilippinePeso, Plus, Receipt, TrendingUp } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { getDashboardData } from "@/lib/data/dashboard";
import { getFarmOverview } from "@/lib/data/farms";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { getSalesOverview, type SalesOverviewRange } from "@/lib/data/sales-overview";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusNote } from "@/components/ui/states";
import { InfoTip } from "@/components/ui/info-tip";
import { Delta } from "@/components/ui/delta";
import { RenewalBanner } from "@/components/subscriptions/renewal-banner";
import { PageShell } from "@/components/layout/page-shell";
// Deferred: Recharts is heavy and must not block the figures. See charts/lazy.
import { EggSizeDonut, ProductionChart, SalesChart } from "@/components/charts/lazy";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { InventoryPanel } from "@/components/dashboard/inventory-panel";
import { FlockStatusPanel } from "@/components/dashboard/flock-status-panel";
import { FarmsOverviewPanel } from "@/components/dashboard/farms-overview-panel";
import { TodayStatus } from "@/components/dashboard/today-status";
import { SalesRangeToggle } from "@/components/dashboard/sales-range-toggle";
import { formatCurrencyShort, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

// Today's numbers change as the farmer records; never serve a cached page.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ salesRange?: string }>;
}) {
  const context = await requireFarmContext();
  const isOwner = canManageBilling(context);
  const showRenewalBanner = isOwner && !context.isBetaOverride;
  const { salesRange: salesRangeParam } = await searchParams;
  const salesRange: SalesOverviewRange = salesRangeParam === "year" ? "year" : "month";

  const [data, farmOverview, subscriptionPeriod] = await Promise.all([
    getDashboardData(context),
    getFarmOverview(context.farmId),
    showRenewalBanner ? getSubscriptionPeriod(context.farmId) : Promise.resolve(null),
  ]);

  const salesOverview = data.money.isComplete
    ? await getSalesOverview(context.farmId, salesRange, data.date)
    : null;

  return (
    <PageShell>
      {showRenewalBanner && subscriptionPeriod && (
        <RenewalBanner
          plan={context.plan}
          status={context.subscriptionStatus}
          currentPeriodEnd={subscriptionPeriod.currentPeriodEnd}
        />
      )}

      {/*
        Status first: this is what the farmer needs to act on, so it sits
        above the figures rather than below them.
      */}
      <TodayStatus alerts={data.alerts} hasRecord={data.today.hasRecord} />

      {/* KPI row: two-up on a phone, five across on a wide screen. */}
      <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          icon={Bird}
          tint="green"
          label="Total birds"
          value={formatNumber(data.today.hens)}
          sublabel="Live birds"
        />
        <StatCard
          icon={Egg}
          tint="amber"
          label="Eggs today"
          value={formatNumber(data.today.eggs)}
          sublabel={`${formatPercent(data.today.layingRate)} laying rate`}
          delta={data.deltas.eggs}
          deltaLabel="vs yesterday"
        />
        <StatCard
          icon={PhilippinePeso}
          tint="teal"
          label="Sales today"
          value={formatCurrencyShort(data.money.revenue, context.currency)}
          sublabel="Total sales"
          delta={data.deltas.revenue}
          deltaLabel="vs yesterday"
        />
        <StatCard
          icon={Receipt}
          tint="rose"
          label="Costs today"
          value={formatCurrencyShort(data.money.operatingCosts, context.currency)}
          sublabel="Feed and expenses"
          delta={data.deltas.expenses}
          deltaLabel="vs yesterday"
          // Costs rising is bad news, so the arrow must not be painted green.
          goodWhenUp={false}
        />
        <StatCard
          icon={TrendingUp}
          tint="violet"
          label="Est. profit"
          value={formatCurrencyShort(data.money.estimatedProfit, context.currency)}
          sublabel="Estimated operating profit"
          delta={data.deltas.profit}
          deltaLabel="vs yesterday"
          className="col-span-2 xl:col-span-1"
        />
      </section>

      {/* Production · sizes · activity */}
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Panel
          title={
            <h2 className="flex items-center gap-1 text-sm font-semibold">
              Production overview
              <InfoTip label="About production overview">
                Total eggs collected each day this week (green), against the same weekday last
                week (gray) — lined up by day of week, not by date, so a Monday always compares
                to the Monday before it. Use it to spot whether production is trending up or down
                week over week.
              </InfoTip>
            </h2>
          }
          className="lg:col-span-7 xl:col-span-6"
          action={<span className="text-xs text-muted-foreground">Last 7 days</span>}
        >
          <ProductionChart data={data.charts.production} />
          <p className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full bg-good" aria-hidden />
              This week
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
              Last week
            </span>
          </p>
        </Panel>

        <Panel title="Eggs by size" className="lg:col-span-5 xl:col-span-3">
          <EggSizeDonut slices={data.charts.sizesToday} total={data.today.eggs} />
        </Panel>

        <Panel title="Recent activity" className="lg:col-span-12 xl:col-span-3">
          <RecentActivity entries={data.activity} timezone={context.timezone} />
        </Panel>
      </div>

      {/* Inventory · sales · flock */}
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <InventoryPanel
          lines={data.inventory.lines}
          totalEggs={data.inventory.totalEggs}
          totalTrays={data.inventory.totalTrays}
          hasNegative={data.inventory.hasNegative}
          ungradedEggs={data.inventory.ungradedEggs}
          lowStockTrays={data.inventory.lowStockTrays}
          className="lg:col-span-6 xl:col-span-4"
        />

        <Panel
          title={
            <h2 className="flex items-center gap-1 text-sm font-semibold">
              Sales overview
              <InfoTip label="About sales overview">
                Total value of egg sales recorded for the selected period, broken down by day
                (This month) or by month (This year). The percentage compares against the same
                number of days in the prior month or year, so a few days into a new month isn&apos;t
                compared against a full previous month.
              </InfoTip>
            </h2>
          }
          className="lg:col-span-6 xl:col-span-5"
          action={salesOverview && <SalesRangeToggle value={salesRange} />}
        >
          {salesOverview ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="stat-figure">
                  {formatCurrencyShort(salesOverview.total, context.currency)}
                </p>
                <Delta value={salesOverview.deltaPercent} label={salesOverview.deltaLabel} />
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Total sales — {salesOverview.rangeLabel}
              </p>
              <SalesChart
                data={salesOverview.series}
                currency={context.currency}
                emptyMessage={`No sales recorded ${salesRange === "month" ? "this month" : "this year"}.`}
              />
            </>
          ) : (
            <StatusNote tone="info">
              Sales tracking is on Starter.{" "}
              <Link href="/pricing" className="font-medium underline">
                See plans
              </Link>
            </StatusNote>
          )}
        </Panel>

        <FlockStatusPanel
          status={data.flockStatus}
          flocks={data.flocks}
          className="lg:col-span-12 xl:col-span-3"
        />
      </div>

      <FarmsOverviewPanel farmName={context.farmName} overview={farmOverview} />

      <Link
        href="/production/new"
        className={cn(buttonVariants({ variant: "primary", size: "lg", block: true }), "lg:hidden")}
      >
        <Plus className="size-5" aria-hidden />
        Record today&apos;s production
      </Link>

      <p className="text-xs text-muted-foreground">
        Estimated operating profit is before depreciation, wages you draw yourself, and loan
        payments.
      </p>
    </PageShell>
  );
}
