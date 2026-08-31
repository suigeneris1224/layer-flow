import type { NextRequest } from "next/server";
import { canManageExpenses } from "@/lib/auth/permissions";
import { getExpenses, getExpensesCount } from "@/lib/data/expenses";
import { EXPENSE_COLUMNS, expensesToRows } from "@/lib/export/datasets";
import { handleExport } from "@/lib/export/route";

/** Expenses as a spreadsheet. See the sales route for why this lives here. */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleExport(request, {
    dataset: "expenses",
    returnPath: "/expenses",
    features: ["data_export", "full_expenses"],
    canManage: canManageExpenses,
    fetchPage: (context, window, offset, limit) =>
      getExpenses(context.farmId, { ...window, offset, limit }),
    count: (context, window) => getExpensesCount(context.farmId, window),
    toRows: expensesToRows,
    columns: EXPENSE_COLUMNS,
  });
}
