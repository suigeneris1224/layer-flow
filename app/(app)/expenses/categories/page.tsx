import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getExpensesByCategory } from "@/lib/data/expenses";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { ExpenseCategoryChart } from "@/components/charts/lazy";
import { RangeSelect } from "@/components/reports/range-select";
import { listRecentMonths, listRecentYears, resolveReportRange } from "@/lib/domain/reports";
import { farmToday, formatCurrency, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Expense categories" };

export const dynamic = "force-dynamic";

export default async function ExpenseCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "full_expenses")) {
    return (
      <PageShell width="reading">
        <PageHeader title="Expense categories" description="Where your money goes, by category." />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "full_expenses")} />
      </PageShell>
    );
  }

  const today = farmToday(context.timezone);
  const { range: rangeParam } = await searchParams;
  const range = resolveReportRange(rangeParam, today);
  const breakdown = await getExpensesByCategory(context, range);

  return (
    <PageShell width="reading">
      <PageHeader
        title="Expense categories"
        description="Where your money goes, by category."
        action={
          <RangeSelect
            basePath="/expenses/categories"
            value={range.value}
            months={listRecentMonths(today)}
            years={listRecentYears(today)}
          />
        }
      />

      {breakdown.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No expenses in this period"
          message="Record an expense and its category breakdown will show up here."
        />
      ) : (
        <Panel title="Spend by category">
          <ExpenseCategoryChart data={breakdown} currency={context.currency} />

          <div className="mt-4 scroll-x">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <caption className="sr-only">Spend by category: {range.label}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 text-left font-medium">Category</th>
                  <th scope="col" className="py-2 text-right font-medium">Spend</th>
                  <th scope="col" className="py-2 text-right font-medium">Share</th>
                  <th scope="col" className="py-2 text-right font-medium">Entries</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.category} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2.5 text-left font-normal">{row.label}</th>
                    <td className="py-2.5 text-right font-medium tabular">
                      {formatCurrency(row.total, context.currency)}
                    </td>
                    <td className="py-2.5 text-right tabular text-muted-foreground">
                      {formatPercent(row.percentage)}
                    </td>
                    <td className="py-2.5 text-right tabular text-muted-foreground">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </PageShell>
  );
}
