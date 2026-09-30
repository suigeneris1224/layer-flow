import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { getWaitlistEntries } from "@/lib/data/waitlist";
import { farmToday } from "@/lib/format";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { describeUnknownError } from "@/lib/errors";
import { toCsv } from "@/lib/export/csv";
import { exportFilename } from "@/lib/export/filename";
import { WAITLIST_COLUMNS } from "@/lib/export/datasets";

/**
 * The paid-plan waitlist as a spreadsheet, for the platform admin. Same shape
 * as app/api/export/payment-history/route.ts (isPlatformAdmin gate, audited),
 * minus the date range -- the list is small and wanted whole.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isPlatformAdmin(user.email)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const entries = await getWaitlistEntries();
    const csv = toCsv(entries, WAITLIST_COLUMNS);
    const today = farmToday("Asia/Manila");

    await recordAuditLog({
      farmId: null,
      userId: user.id,
      action: AUDIT_ACTIONS.DATA_EXPORTED,
      entityType: "export",
      entityId: null,
      metadata: { dataset: "waitlist", rows: entries.length },
    });

    const filename = exportFilename({ dataset: "waitlist", farmName: "platform", from: null, to: today });

    return new NextResponse(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    describeUnknownError(error, "export:waitlist");
    return NextResponse.redirect(new URL("/admin/waitlist?export=failed", request.url));
  }
}
