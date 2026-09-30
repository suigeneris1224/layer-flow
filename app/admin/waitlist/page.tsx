import type { Metadata } from "next";
import type { Route } from "next";
import { Download, ListChecks } from "lucide-react";
import { getWaitlistEntries } from "@/lib/data/waitlist";
import { WAITLIST_FLOCK_SIZES } from "@/lib/domain/waitlist";
import { paginate, ADMIN_PAGE_SIZE } from "@/lib/domain/admin";
import { PLANS, PLAN_ORDER } from "@/lib/subscriptions/plans";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { ExportNotice } from "@/lib/export/notices";
import { AdminPagination } from "../pagination";
import { WaitlistTable } from "./waitlist-table";

export const metadata: Metadata = { title: "Admin — Waitlist" };

export const dynamic = "force-dynamic";

/**
 * Farmers who asked for a paid plan while BILLING_MODE=validation
 * (docs/billing.md) -- the demand signal, and the contact list for when paid
 * plans open. Every entry consented to being contacted; export it as CSV.
 */
export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; export?: string }>;
}) {
  const { page: pageParam, export: exportReason } = await searchParams;
  const rows = await getWaitlistEntries();
  const { items: pageRows, page, totalPages, totalItems } = paginate(
    rows,
    Number(pageParam) || 1,
    ADMIN_PAGE_SIZE
  );

  const now = new Date();
  const onTrial = rows.filter((row) => row.trialEndsAt && new Date(row.trialEndsAt) > now).length;
  const paidPlans = PLAN_ORDER.filter((id) => id !== "FREE");

  const pageHref = (targetPage: number): Route =>
    (targetPage > 1 ? `/admin/waitlist?page=${targetPage}` : "/admin/waitlist") as Route;

  return (
    <PageShell>
      <PageHeader
        title="Waitlist"
        description="Farmers waiting for paid plans, with their flock size and the plan they want."
        action={
          rows.length > 0 ? (
            <a href="/api/export/waitlist" className={buttonVariants({ variant: "outline" })}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </a>
          ) : null
        }
      />

      <ExportNotice reason={exportReason} />

      {rows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No one on the waitlist yet"
          message="Entries appear here when an owner upgrades while BILLING_MODE=validation."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Panel title="On the list" bodyClassName="p-4">
              <p className="text-2xl font-bold tabular">{rows.length}</p>
              <p className="text-xs text-muted-foreground">{onTrial} on a trial now</p>
            </Panel>
            {paidPlans.map((id) => (
              <Panel key={id} title={`Want ${PLANS[id].name}`} bodyClassName="p-4">
                <p className="text-2xl font-bold tabular">
                  {rows.filter((row) => row.planWanted === id).length}
                </p>
                <p className="text-xs text-muted-foreground">accounts</p>
              </Panel>
            ))}
            <Panel title="By flock size" bodyClassName="p-4">
              <dl className="flex flex-col gap-1 text-xs">
                {WAITLIST_FLOCK_SIZES.map((option) => (
                  <div key={option.value} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{option.label}</dt>
                    <dd className="font-medium tabular">
                      {rows.filter((row) => row.flockSize === option.value).length}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>

          <Panel title="Entries" bodyClassName="p-0">
            <WaitlistTable rows={pageRows} />
            <AdminPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              itemLabel="entry"
              hrefForPage={pageHref}
            />
          </Panel>
        </>
      )}
    </PageShell>
  );
}
