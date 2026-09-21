import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { getManualPaymentsHistory } from "@/lib/data/manual-payments";
import { getPaymongoPaymentsHistory } from "@/lib/data/paymongo-payments";
import { mergePaymentHistory } from "@/lib/domain/payment-history";
import { resolveReportRange } from "@/lib/domain/reports";
import { farmToday } from "@/lib/format";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { describeUnknownError } from "@/lib/errors";
import { toCsv } from "@/lib/export/csv";
import { exportFilename } from "@/lib/export/filename";
import { PAYMENT_HISTORY_COLUMNS, paymentHistoryToRows } from "@/lib/export/datasets";

/**
 * Every payment -- manual and PayMongo, any status -- as a spreadsheet, for the platform admin.
 *
 * Deliberately not `handleExport` (lib/export/route.ts) -- that helper is
 * wired to one farm's FarmContext (entitlement checks, farm timezone/currency,
 * a farm-scoped audit row), none of which applies to a cross-tenant admin
 * export. This is the admin equivalent, gated by isPlatformAdmin instead of
 * canManage + a feature entitlement.
 */
export const dynamic = "force-dynamic";

const ALL = "all";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isPlatformAdmin(user.email)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // No single farm's timezone applies to a platform-wide export -- this
    // matches docs/deployment.md's Philippines-first deployment region.
    const today = farmToday("Asia/Manila");
    const rangeParam = request.nextUrl.searchParams.get("range");
    const unbounded = rangeParam === ALL;
    const range = unbounded ? null : resolveReportRange(rangeParam ?? undefined, today);

    const from = range?.from;
    const to = range?.to ?? today;
    const window = { from, to };

    const [manualPayments, paymongoPayments] = await Promise.all([
      getManualPaymentsHistory(window),
      getPaymongoPaymentsHistory(window),
    ]);
    const payments = mergePaymentHistory(manualPayments, paymongoPayments);
    const rows = paymentHistoryToRows(payments);
    const csv = toCsv(rows, PAYMENT_HISTORY_COLUMNS);

    await recordAuditLog({
      farmId: null,
      userId: user.id,
      action: AUDIT_ACTIONS.DATA_EXPORTED,
      entityType: "export",
      entityId: null,
      metadata: { dataset: "payment-history", from: from ?? null, to, rows: rows.length },
    });

    const filename = exportFilename({
      dataset: "payment-history",
      farmName: "platform",
      from: from ?? null,
      to,
    });

    return new NextResponse(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    describeUnknownError(error, "export:payment-history");
    return NextResponse.redirect(new URL("/admin/payment-history?export=failed", request.url));
  }
}
