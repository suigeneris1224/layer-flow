import type { Metadata } from "next";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageExpenses } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getExpenseFormData } from "@/lib/data/expenses";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { farmToday } from "@/lib/format";
import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = { title: "Record an expense" };

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const today = farmToday(context.timezone);

  if (!canAccess(entitlement, "full_expenses")) {
    return (
      <PageShell width="reading">
        <PageHeader title="Record an expense" />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "full_expenses")} />
      </PageShell>
    );
  }

  if (!canManageExpenses(context)) {
    return (
      <PageShell width="reading">
        <PageHeader title="Record an expense" />
        <StatusNote tone="info">
          Only the farm owner or a manager can record expenses.
        </StatusNote>
      </PageShell>
    );
  }

  const { flocks } = await getExpenseFormData(context.farmId);

  return (
    <PageShell width="reading">
      <PageHeader
        title="Record an expense"
        description="Feed, chicks, medicine, labor — whatever it costs to run the farm."
      />

      <ExpenseForm flocks={flocks} today={today} currency={context.currency} />
    </PageShell>
  );
}
