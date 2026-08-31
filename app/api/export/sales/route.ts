import type { NextRequest } from "next/server";
import { canManageSales } from "@/lib/auth/permissions";
import { getSales, getSalesCount } from "@/lib/data/sales";
import { SALES_COLUMNS, salesToRows } from "@/lib/export/datasets";
import { handleExport } from "@/lib/export/route";

/**
 * Sales as a spreadsheet.
 *
 * Lives under /api rather than /(app)/sales/export because a static `export`
 * segment there would shadow /sales/[id] -- and route handlers do not run the
 * (app) layout anyway, so the grouping would buy nothing.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleExport(request, {
    dataset: "sales",
    returnPath: "/sales",
    // You cannot export what you cannot see: a Pro farm always has both, but
    // stating it keeps that true by construction rather than by coincidence.
    features: ["data_export", "egg_sales"],
    canManage: canManageSales,
    fetchPage: (context, window, offset, limit) =>
      getSales(context, { ...window, offset, limit }),
    count: (context, window) => getSalesCount(context, window),
    toRows: salesToRows,
    columns: SALES_COLUMNS,
  });
}
