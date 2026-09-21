import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FolderTree, Receipt } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageExpenses } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import {
  EXPENSES_HISTORY_RANGES,
  getExpenses,
  getExpensesCount,
  type ExpensesHistoryRangeValue,
} from "@/lib/data/expenses";
import { resolveReportRange } from "@/lib/domain/reports";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/domain/expenses";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { buttonVariants } from "@/components/ui/button";
import { farmToday, formatCurrency, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExportMenu } from "@/components/export/export-menu";
import { ExportNotice } from "@/lib/export/notices";
import { ExpensesRangeSelect } from "@/components/expenses/expenses-range-select";

export const metadata: Metadata = { title: "Expenses" };

export const dynamic = "force-dynamic";

const EXPENSES_PER_PAGE = 10;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; export?: string; range?: string }>;
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

  const { page: pageParam, export: exportReason, range: rangeParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const range: ExpensesHistoryRangeValue = EXPENSES_HISTORY_RANGES.includes(
    rangeParam as ExpensesHistoryRangeValue
  )
    ? (rangeParam as ExpensesHistoryRangeValue)
    : "week";

  const today = farmToday(context.timezone);
  // "all" stays unbounded -- getExpenses/getExpensesCount only filter on
  // from/to when given, so leaving both undefined is exactly "every expense
  // ever," matching sales/page.tsx's identical bounds logic.
  const bounds: { from?: string; to?: string } =
    range === "all" ? {} : resolveReportRange(range, today);

  const [expenses, expensesCount, allTimeCount] = await Promise.all([
    getExpenses(context.farmId, {
      from: bounds.from,
      to: bounds.to,
      limit: EXPENSES_PER_PAGE,
      offset: (page - 1) * EXPENSES_PER_PAGE,
    }),
    getExpensesCount(context.farmId, { from: bounds.from, to: bounds.to }),
    // Cheap head-count, unscoped -- only used to tell "no expenses in this
    // period" apart from "no expenses ever" for the empty state below.
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
          <div className="flex flex-wrap items-center gap-2">
            <ExpensesRangeSelect value={range} />
            <Link
              href="/expenses/categories"
              className={cn(buttonVariants({ variant: "outline", size: "md" }))}
            >
              <FolderTree className="size-4" aria-hidden />
              Categories
            </Link>
            {canManage && (
              <>
                <ExportMenu
                  action="/api/export/expenses"
                  label="Expenses"
                  locked={!canAccess(entitlement, "data_export")}
                  fixedRange={range}
                />
                <Link href="/expenses/new" className={cn(buttonVariants({ size: "md" }))}>
                  <Receipt className="size-4" aria-hidden />
                  Record an expense
                </Link>
              </>
            )}
          </div>
        }
      />

      <ExportNotice reason={exportReason} />

      {expensesCount === 0 ? (
        allTimeCount === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            message="Record what you spend to see your real profit on the dashboard."
            actionLabel={canManage ? "Record an expense" : undefined}
            actionHref={canManage ? "/expenses/new" : undefined}
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="No expenses in this period"
            message="Try a different date range, or view everything at once."
            actionLabel="View all time"
            actionHref="/expenses?range=all"
          />
        )
      ) : (
        <Panel title={range === "all" ? "All expenses" : "Recent expenses"}>
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
                  href={
                    page > 1
                      ? `/expenses?range=${range}&page=${page - 1}`
                      : `/expenses?range=${range}`
                  }
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
                  href={`/expenses?range=${range}&page=${page + 1}`}
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
