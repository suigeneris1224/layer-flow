import type { Metadata } from "next";
import { getAllSubscriptions } from "@/lib/data/admin";
import { PLANS, PLAN_ORDER } from "@/lib/subscriptions/plans";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { InfoTip } from "@/components/ui/info-tip";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Admin — Overview" };

export const dynamic = "force-dynamic";

/** Whole days from now to `end`, negative when already past. */
function daysRemaining(end: string): number {
  const ms = new Date(end).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Platform-wide stat aggregates only -- the tenant table, manual-payment
 * queue, ticket queue and beta controls each moved to their own route
 * (see app/admin/layout.tsx's sidebar). This page fetches just enough to
 * compute the numbers below, not the full account list's every detail.
 */
export default async function AdminOverviewPage() {
  const rows = await getAllSubscriptions();

  const countByPlan = Object.fromEntries(
    PLAN_ORDER.map((id) => [id, rows.filter((row) => row.plan === id).length])
  ) as Record<string, number>;

  const annualRows = rows.filter((row) => row.billingPeriod === "ANNUAL");
  const activeOrPastDue = (row: (typeof rows)[number]) =>
    row.status === "ACTIVE" || row.status === "PAST_DUE";

  // Annual accounts are normalized to a monthly-equivalent (annual / 12) so
  // this stays comparable across both cadences rather than understating
  // annual revenue by its full 12x.
  const monthlyEstimate = rows.filter(activeOrPastDue).reduce((sum, row) => {
    const plan = PLANS[row.plan];
    const monthlyEquivalent =
      row.billingPeriod === "ANNUAL" ? plan.priceCentavosAnnual / 12 : plan.priceCentavosMonthly;
    return sum + monthlyEquivalent;
  }, 0);

  // The actual cash committed by annual accounts, not normalized -- distinct
  // from monthlyEstimate above, which flattens it to a monthly-equivalent.
  const annualRevenueBooked = annualRows
    .filter(activeOrPastDue)
    .reduce((sum, row) => sum + PLANS[row.plan].priceCentavosAnnual, 0);

  const expiringSoon = rows.filter(
    (row) => row.currentPeriodEnd !== null && daysRemaining(row.currentPeriodEnd) <= 7 && daysRemaining(row.currentPeriodEnd) >= 0
  ).length;

  // A longer look-ahead than the 7-day window above: an annual renewal is a
  // once-a-year, higher-stakes event worth surfacing with more lead time.
  const annualRenewingSoon = annualRows.filter(
    (row) => row.currentPeriodEnd !== null && daysRemaining(row.currentPeriodEnd) <= 30 && daysRemaining(row.currentPeriodEnd) >= 0
  ).length;

  return (
    <PageShell>
      <PageHeader
        title="Overview"
        description="Platform-wide numbers, soonest-expiring first. See the sidebar for accounts, payments, email and support."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {PLAN_ORDER.map((id) => (
          <Panel key={id} title={PLANS[id].name} bodyClassName="p-4">
            <p className="text-2xl font-bold tabular">{countByPlan[id] ?? 0}</p>
            <p className="text-xs text-muted-foreground">accounts</p>
          </Panel>
        ))}
        <Panel
          title={
            <h2 className="flex items-center gap-1 text-sm font-semibold">
              Est. monthly
              <InfoTip label="About est. monthly">
                Sum of each ACTIVE or PAST_DUE account&apos;s plan price. No proration — an
                account that upgraded mid-period is counted at its current plan price for the
                full month, not a blended rate. Treat this as a rough estimate, not a real
                revenue figure.
              </InfoTip>
            </h2>
          }
          bodyClassName="p-4"
        >
          <p className="text-2xl font-bold tabular">{formatCurrency(monthlyEstimate / 100)}</p>
          <p className="text-xs text-muted-foreground">
            active + past due, no proration
          </p>
        </Panel>
        <Panel title="Expiring in 7 days" bodyClassName="p-4">
          <p className="text-2xl font-bold tabular">{expiringSoon}</p>
          <p className="text-xs text-muted-foreground">accounts</p>
        </Panel>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Annual plans</h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Panel title="Annual accounts" bodyClassName="p-4">
            <p className="text-2xl font-bold tabular">{annualRows.length}</p>
            <p className="text-xs text-muted-foreground">
              of {rows.length} total ({rows.length > 0 ? Math.round((annualRows.length / rows.length) * 100) : 0}%)
            </p>
          </Panel>
          <Panel
            title={
              <h2 className="flex items-center gap-1 text-sm font-semibold">
                Annual revenue booked
                <InfoTip label="About annual revenue booked">
                  Sum of the full annual price for each ACTIVE or PAST_DUE account on annual
                  billing -- the actual amount committed for the year, not spread out monthly
                  like &quot;Est. monthly&quot; above.
                </InfoTip>
              </h2>
            }
            bodyClassName="p-4"
          >
            <p className="text-2xl font-bold tabular">{formatCurrency(annualRevenueBooked / 100)}</p>
            <p className="text-xs text-muted-foreground">active + past due, no proration</p>
          </Panel>
          <Panel title="Renewing in 30 days" bodyClassName="p-4">
            <p className="text-2xl font-bold tabular">{annualRenewingSoon}</p>
            <p className="text-xs text-muted-foreground">annual accounts</p>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
