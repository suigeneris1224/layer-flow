import type { Metadata } from "next";
import { getAllSubscriptions } from "@/lib/data/admin";
import { PLANS, PLAN_ORDER } from "@/lib/subscriptions/plans";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { formatCurrency } from "@/lib/format";
import { Building2 } from "lucide-react";
import { AdminFarmRow } from "./admin-farm-row";

export const metadata: Metadata = { title: "Admin — Subscriptions" };

export const dynamic = "force-dynamic";

/** Whole days from now to `end`, negative when already past. */
function daysRemaining(end: string): number {
  const ms = new Date(end).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default async function AdminSubscriptionsPage() {
  const rows = await getAllSubscriptions();

  const countByPlan = Object.fromEntries(
    PLAN_ORDER.map((id) => [id, rows.filter((row) => row.plan === id).length])
  ) as Record<string, number>;

  const monthlyEstimate = rows
    .filter((row) => row.status === "ACTIVE" || row.status === "PAST_DUE")
    .reduce((sum, row) => sum + PLANS[row.plan].priceCentavos, 0);

  const expiringSoon = rows.filter(
    (row) => row.currentPeriodEnd !== null && daysRemaining(row.currentPeriodEnd) <= 7 && daysRemaining(row.currentPeriodEnd) >= 0
  ).length;

  return (
    <PageShell>
      <PageHeader
        title="Subscriptions"
        description="Every farm on the platform, soonest-expiring first."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {PLAN_ORDER.map((id) => (
          <Panel key={id} title={PLANS[id].name} bodyClassName="p-4">
            <p className="text-2xl font-bold tabular">{countByPlan[id] ?? 0}</p>
            <p className="text-xs text-muted-foreground">farms</p>
          </Panel>
        ))}
        <Panel title="Est. monthly" bodyClassName="p-4">
          <p className="text-2xl font-bold tabular">{formatCurrency(monthlyEstimate / 100)}</p>
          <p className="text-xs text-muted-foreground">
            active + past due, no proration
          </p>
        </Panel>
        <Panel title="Expiring in 7 days" bodyClassName="p-4">
          <p className="text-2xl font-bold tabular">{expiringSoon}</p>
          <p className="text-xs text-muted-foreground">farms</p>
        </Panel>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="No farms yet" message="Nothing to monitor yet." />
      ) : (
        <Panel title="All farms" bodyClassName="p-0">
          <div className="scroll-x">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <caption className="sr-only">Every farm&apos;s subscription, soonest-expiring first</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="p-3 text-left font-medium">Farm</th>
                  <th scope="col" className="p-3 text-left font-medium">Owner</th>
                  <th scope="col" className="p-3 text-left font-medium">Plan</th>
                  <th scope="col" className="p-3 text-left font-medium">Status</th>
                  <th scope="col" className="p-3 text-right font-medium">Renews / expires</th>
                  <th scope="col" className="p-3 text-right font-medium">Days left</th>
                  <th scope="col" className="p-3 text-right font-medium">Override</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <AdminFarmRow key={row.farmId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </PageShell>
  );
}
