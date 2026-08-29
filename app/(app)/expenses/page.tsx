import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FolderTree, Receipt } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageExpenses } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getExpenses, getExpensesCount } from "@/lib/data/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/domain/expenses";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Expenses" };

export const dynamic = "force-dynamic";

const EXPENSES_PER_PAGE = 10;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "full_expenses")) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Expenses"
          description="Track what it costs to run the farm."
        />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "full_expenses")} />
      </PageShell>
    );
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [expenses, expensesCount] = await Promise.all([
    getExpenses(context.farmId, { limit: EXPENSES_PER_PAGE, offset: (page - 1) * EXPENSES_PER_PAGE }),
    getExpensesCount(context.farmId),
  ]);

  const totalPages = Math.max(1, Math.ceil(expensesCount / EXPENSES_PER_PAGE));
  const canManage = canManageExpenses(context);

  return (
    <PageShell>
      <PageHeader
        title="Expenses"
        description="What it costs to run the farm."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/expenses/categories"
              className={cn(buttonVariants({ variant: "outline", size: "md" }))}
            >
              <FolderTree className="size-4" aria-hidden />
              Categories
            </Link>
            {canManage && (
              <Link href="/expenses/new" className={cn(buttonVariants({ size: "md" }))}>
                <Receipt className="size-4" aria-hidden />
                Record an expense
              </Link>
            )}
          </div>
        }
      />

      {expensesCount === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          message="Record what you spend to see your real profit on the dashboard."
          actionLabel={canManage ? "Record an expense" : undefined}
          actionHref={canManage ? "/expenses/new" : undefined}
        />
      ) : (
        <Panel title="Recent expenses">
          <ul className="flex flex-col divide-y divide-border">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {EXPENSE_CATEGORY_LABELS[expense.category]}
                    {expense.description && ` · ${expense.description}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatRelativeDay(expense.expenseDate, context.timezone)}
                    {expense.flockName && ` · ${expense.flockName}`}
                  </p>
                </div>

                <span className="text-right text-sm font-semibold tabular">
                  {formatCurrency(expense.amount, context.currency)}
                </span>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-muted-foreground sm:order-2 sm:text-left">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2 sm:order-1">
                <Link
                  href={page > 1 ? `/expenses?page=${page - 1}` : "/expenses"}
                  aria-disabled={page <= 1}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "flex-1 justify-center sm:flex-none",
                    page <= 1 && "pointer-events-none opacity-50"
                  )}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Previous
                </Link>

                <Link
                  href={`/expenses?page=${page + 1}`}
                  aria-disabled={page >= totalPages}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "flex-1 justify-center sm:flex-none",
                    page >= totalPages && "pointer-events-none opacity-50"
                  )}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </Panel>
      )}
    </PageShell>
  );
}
