import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { getFarmContext, getSessionUser, type FarmContext } from "@/lib/auth/session";
import {
  assertCanAccess,
  EntitlementError,
  historyCutoffDate,
} from "@/lib/subscriptions/entitlements";
import type { Feature } from "@/lib/subscriptions/plans";
import { resolveReportRange } from "@/lib/domain/reports";
import { farmToday } from "@/lib/format";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { describeUnknownError } from "@/lib/errors";
import { toCsv, type CsvColumn } from "@/lib/export/csv";
import { exportFilename } from "@/lib/export/filename";
import { EXPORT_HARD_CAP, EXPORT_PAGE_SIZE, fetchAllPages } from "@/lib/export/paginate";

/**
 * The shared body of an export route.
 *
 * Route handlers do not run app/(app)/layout.tsx, so unlike every page in the
 * app these cannot assume a signed-in user or a farm -- they do their own
 * `getSessionUser()` and `getFarmContext()`.
 *
 * The gate order mirrors the server actions (see app/(app)/customers/actions.ts):
 * session, farm, role, input, entitlement, then the read.
 */

/** Unbounded: every record the farm has. */
const ALL = "all";

export interface ExportDefinition<TSource, TRow> {
  /** Used in the filename and the audit metadata: "sales", "expenses". */
  dataset: string;
  /** Where to send a rejected request back to, e.g. "/sales". */
  returnPath: string;
  /** Both must pass: the export feature, and the feature that shows the data. */
  features: readonly Feature[];
  /** May this member touch this data at all? */
  canManage: (context: FarmContext) => boolean;
  fetchPage: (
    context: FarmContext,
    window: { from?: string; to?: string },
    offset: number,
    limit: number
  ) => Promise<TSource[]>;
  count: (context: FarmContext, window: { from?: string; to?: string }) => Promise<number>;
  /** Source records to spreadsheet rows. One source record may become several. */
  toRows: (source: TSource[], currency: string) => TRow[];
  columns: readonly CsvColumn<TRow>[];
}

function back(request: NextRequest, path: string, reason: string): NextResponse {
  return NextResponse.redirect(new URL(`${path}?export=${reason}`, request.url));
}

export async function handleExport<TSource, TRow>(
  request: NextRequest,
  definition: ExportDefinition<TSource, TRow>
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const context = await getFarmContext();
  if (!context) return NextResponse.redirect(new URL("/onboarding", request.url));

  /*
   * The only enforcement there is.
   *
   * Unlike every other gate in the app, RLS does not mirror this one: a WORKER
   * can read egg_sales and expenses, because the dashboard and reports they
   * are allowed to see are built from those rows. Bulk-extracting the farm's
   * whole customer list and revenue is a different act from reading a summary,
   * and this check is what separates them.
   */
  if (!definition.canManage(context)) {
    return back(request, definition.returnPath, "denied");
  }

  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  try {
    for (const feature of definition.features) assertCanAccess(entitlement, feature);
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.redirect(new URL("/pricing", request.url));
    }
    throw error;
  }

  const today = farmToday(context.timezone);
  const rangeParam = request.nextUrl.searchParams.get("range");

  /*
   * No schema here on purpose. `resolveReportRange` is total -- it validates
   * the m:/y: forms itself and falls through to its 30-day default on anything
   * else -- so a Zod parse would only restate what it already guarantees.
   */
  const unbounded = rangeParam === ALL;
  const range = unbounded ? null : resolveReportRange(rangeParam ?? undefined, today);

  /*
   * A no-op today: data_export is Pro, and Pro's history_days is null. Kept so
   * that moving the feature down to Starter later cannot quietly hand somebody
   * more history than their plan shows them on screen.
   */
  const cutoff = historyCutoffDate(entitlement);
  const cutoffDay = cutoff ? cutoff.toISOString().slice(0, 10) : null;

  const from = range
    ? cutoffDay && cutoffDay > range.from
      ? cutoffDay
      : range.from
    : cutoffDay;
  const to = range ? range.to : today;
  const window = { from: from ?? undefined, to };

  try {
    const expected = await definition.count(context, window);
    if (expected > EXPORT_HARD_CAP) {
      return back(request, definition.returnPath, "too-large");
    }

    const source = await fetchAllPages(
      (offset, limit) => definition.fetchPage(context, window, offset, limit),
      { pageSize: EXPORT_PAGE_SIZE, hardCap: EXPORT_HARD_CAP }
    );

    /*
     * The data layer logs and returns [] on a failed query, so a hiccup partway
     * through the loop looks exactly like reaching the end. A short file that
     * looks complete is the worst outcome here -- somebody takes it to a
     * lender. Better to fail loudly and let them try again.
     */
    if (source.length !== expected) {
      return back(request, definition.returnPath, "failed");
    }

    const rows = definition.toRows(source, context.currency);
    const csv = toCsv(rows, definition.columns);

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.DATA_EXPORTED,
      entityType: "export",
      entityId: null,
      metadata: { dataset: definition.dataset, from, to, rows: rows.length },
    });

    const filename = exportFilename({
      dataset: definition.dataset,
      farmName: context.farmName,
      from,
      to,
    });

    /*
     * The BOM is what makes Excel on Windows read this as UTF-8. Without it a
     * customer named Muñoz opens as mojibake -- and it is deliberately added
     * here rather than in `toCsv`, so the serializer's tests read like a CSV.
     */
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // The filename is ASCII by construction, so no RFC 5987 form is needed.
        "Content-Disposition": `attachment; filename="${filename}"`,
        // A farm's revenue and customer list must never reach a shared cache.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    describeUnknownError(error, `export:${definition.dataset}`);
    return back(request, definition.returnPath, "failed");
  }
}
