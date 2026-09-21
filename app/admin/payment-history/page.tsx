import type { Metadata } from "next";
import type { Route } from "next";
import { History } from "lucide-react";
import { getManualPaymentsHistory } from "@/lib/data/manual-payments";
import { resolveReportRange } from "@/lib/domain/reports";
import { farmToday } from "@/lib/format";
import { paginate, ADMIN_PAGE_SIZE } from "@/lib/domain/admin";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { ExportMenu } from "@/components/export/export-menu";
import { ExportNotice } from "@/lib/export/notices";
import { AdminPagination } from "../pagination";
import { PaymentHistoryRangeSelect } from "./payment-history-range-select";
import { PaymentHistoryTable } from "./payment-history-table";

export const metadata: Metadata = { title: "Admin — Payment history" };

export const dynamic = "force-dynamic";

const ALL = "all";

/**
 * Every manual GCash/bank payment ever submitted -- PENDING, APPROVED, and
 * REJECTED together -- for bookkeeping and monthly/yearly export. The active
 * review queue (PENDING only) stays on /admin/subscriptions; this is the
 * full historical record.
 */
export default async function AdminPaymentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string; export?: string }>;
}) {
  const { range: rangeParam, page: pageParam, export: exportReason } = await searchParams;
  const range = rangeParam ?? "month";

  const today = farmToday("Asia/Manila");
  const unbounded = range === ALL;
  const resolved = unbounded ? null : resolveReportRange(range, today);
  const window = { from: resolved?.from, to: resolved?.to ?? today };

  const rows = await getManualPaymentsHistory(window);
  const { items: pageRows, page, totalPages, totalItems } = paginate(
    rows,
    Number(pageParam) || 1,
    ADMIN_PAGE_SIZE
  );

  const pageHref = (targetPage: number): Route => {
    const params = new URLSearchParams();
    if (range !== "month") params.set("range", range);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return (query ? `/admin/payment-history?${query}` : "/admin/payment-history") as Route;
  };

  return (
    <PageShell>
      <PageHeader
        title="Payment history"
        description="Every manual GCash/bank payment ever submitted, for bookkeeping and export."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PaymentHistoryRangeSelect value={range} />
            <ExportMenu
              action="/api/export/payment-history"
              label="Payment history"
              locked={false}
              fixedRange={range}
            />
          </div>
        }
      />

      <ExportNotice reason={exportReason} />

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No payments in this period"
          message="Try a different date range, or view everything at once."
          actionLabel="View all time"
          actionHref="/admin/payment-history?range=all"
        />
      ) : (
        <Panel title={resolved ? resolved.label : "All time"} bodyClassName="p-0">
          <PaymentHistoryTable rows={pageRows} />
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemLabel="payment"
            hrefForPage={pageHref}
          />
        </Panel>
      )}
    </PageShell>
  );
}
