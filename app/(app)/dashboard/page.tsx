import type { Metadata } from "next";
import Link from "next/link";
import { Bird, Egg, PhilippinePeso, Plus, Receipt, TrendingUp } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/data/dashboard";
import { getFarmOverview } from "@/lib/data/farms";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusNote } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";
// Deferred: Recharts is heavy and must not block the figures. See charts/lazy.
import { EggSizeDonut, ProductionChart, SalesChart } from "@/components/charts/lazy";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { InventoryPanel } from "@/components/dashboard/inventory-panel";
import { FlockStatusPanel } from "@/components/dashboard/flock-status-panel";
import { FarmsOverviewPanel } from "@/components/dashboard/farms-overview-panel";
import { TodayStatus } from "@/components/dashboard/today-status";
import { formatCurrencyShort, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

// Today's numbers change as the farmer records; never serve a cached page.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireFarmContext();
  const [data, farmOverview] = await Promise.all([
    getDashboardData(context),
    getFarmOverview(context.farmId),
  ]);

  return (
    <PageShell>
      {/*
        Status first: this is what the farmer needs to act on, so it sits
        above the figures rather than below them. The topbar bell links to
        #todays-status, which TodayStatus owns.
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
          title="Production overview"
          className="lg:col-span-7 xl:col-span-6"
          action={<span className="text-xs text-muted-foreground">Last 7 days</span>}
        >
          <ProductionChart data={data.charts.production} />
          <p className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-good" aria-hidden />
              This week
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-muted-foreground/50" aria-hidden />
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
          className="lg:col-span-6 xl:col-span-4"
        />

        <Panel
          title="Sales overview"
          className="lg:col-span-6 xl:col-span-5"
          action={<span className="text-xs text-muted-foreground">Last 30 days</span>}
        >
          {data.money.isComplete ? (
            <SalesChart data={data.charts.sales} currency={context.currency} />
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
