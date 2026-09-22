import type { Metadata } from "next";
import { getAllSubscriptions } from "@/lib/data/admin";
import { getPendingManualPayments } from "@/lib/data/manual-payments";
import {
  getAccountDeletionHistory,
  getPendingAccountDeletionRequests,
} from "@/lib/data/account-deletion";
import { searchFarms, paginate, ADMIN_PAGE_SIZE } from "@/lib/domain/admin";
import type { Route } from "next";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { Building2 } from "lucide-react";
import { FarmSearch } from "./farm-search";
import { BillingPeriodFilter } from "./billing-period-filter";
import { AdminPagination } from "../pagination";
import { SubscriptionsTable } from "./subscriptions-table";
import { ManualPaymentsPanel } from "./manual-payments-panel";
import { AccountDeletionPanel } from "./account-deletion-panel";
import { AccountDeletionHistoryPanel } from "./account-deletion-history-panel";

export const metadata: Metadata = { title: "Admin — Subscriptions" };

export const dynamic = "force-dynamic";

/**
 * Tenant subscriptions: search/filter/paginate every account, plus the
 * queues of manual GCash/bank payments and account deletion requests
 * waiting on an admin's approve/reject. Only fetches what this page needs --
 * the platform-wide stat aggregates live on the Overview route instead.
 */
export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; period?: string; deletionPage?: string }>;
}) {
  const { q = "", page: pageParam, period = "all", deletionPage: deletionPageParam } =
    await searchParams;
  const [rows, pendingManualPayments, pendingDeletionRequests, deletionHistory] =
    await Promise.all([
      getAllSubscriptions(),
      getPendingManualPayments(),
      getPendingAccountDeletionRequests(),
      getAccountDeletionHistory(),
    ]);

  const annualRows = rows.filter((row) => row.billingPeriod === "ANNUAL");

  // Filtered against every farm, not just the current page -- pagination
  // slices what's left over after this, never before it.
  const periodFiltered =
    period === "monthly"
      ? rows.filter((row) => row.billingPeriod === "MONTHLY")
      : period === "annual"
        ? annualRows
        : rows;
  const filtered = searchFarms(periodFiltered, q);
  const { items: pageRows, page, totalPages, totalItems } = paginate(
    filtered,
    Number(pageParam) || 1,
    ADMIN_PAGE_SIZE
  );

  const pageHref = (targetPage: number): Route => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (period !== "all") params.set("period", period);
    if (targetPage > 1) params.set("page", String(targetPage));
    if (deletionPageParam) params.set("deletionPage", deletionPageParam);
    const query = params.toString();
    return (query ? `/admin/subscriptions?${query}` : "/admin/subscriptions") as Route;
  };

  const {
    items: deletionHistoryPageRows,
    page: deletionHistoryPage,
    totalPages: deletionHistoryTotalPages,
    totalItems: deletionHistoryTotalItems,
  } = paginate(deletionHistory, Number(deletionPageParam) || 1, ADMIN_PAGE_SIZE);

  const deletionPageHref = (targetPage: number): Route => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (period !== "all") params.set("period", period);
    if (pageParam) params.set("page", pageParam);
    if (targetPage > 1) params.set("deletionPage", String(targetPage));
    const query = params.toString();
    return (query ? `/admin/subscriptions?${query}` : "/admin/subscriptions") as Route;
  };

  return (
    <PageShell>
      <PageHeader
        title="Subscriptions"
        description="Every account on the platform, soonest-expiring first."
      />

      <ManualPaymentsPanel payments={pendingManualPayments} />
      <AccountDeletionPanel requests={pendingDeletionRequests} />
      <AccountDeletionHistoryPanel
        requests={deletionHistoryPageRows}
        page={deletionHistoryPage}
        totalPages={deletionHistoryTotalPages}
        totalItems={deletionHistoryTotalItems}
        hrefForPage={deletionPageHref}
      />

      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="No accounts yet" message="Nothing to monitor yet." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FarmSearch initialQuery={q} period={period} />
            <BillingPeriodFilter period={period} q={q} />
          </div>

          <Panel title="All accounts" bodyClassName="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No matching accounts"
                message={
                  q
                    ? `No farm name or owner email matches "${q}".`
                    : "No accounts on this billing period."
                }
              />
            ) : (
              <>
                <SubscriptionsTable rows={pageRows} />
                <AdminPagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemLabel="account"
                  hrefForPage={pageHref}
                />
              </>
            )}
          </Panel>
        </>
      )}
    </PageShell>
  );
}
