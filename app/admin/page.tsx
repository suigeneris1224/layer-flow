import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { getAllSubscriptions } from "@/lib/data/admin";
import { searchFarms, paginate, ADMIN_PAGE_SIZE } from "@/lib/domain/admin";
import { PLANS, PLAN_ORDER } from "@/lib/subscriptions/plans";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Building2, Mail } from "lucide-react";
import { AdminFarmRow } from "./admin-farm-row";
import { FarmSearch } from "./farm-search";
import { AdminPagination } from "./pagination";

export const metadata: Metadata = { title: "Admin — Subscriptions" };

export const dynamic = "force-dynamic";

/** Whole days from now to `end`, negative when already past. */
function daysRemaining(end: string): number {
  const ms = new Date(end).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageParam } = await searchParams;
  const rows = await getAllSubscriptions();

  const countByPlan = Object.fromEntries(
    PLAN_ORDER.map((id) => [id, rows.filter((row) => row.plan === id).length])
  ) as Record<string, number>;

  const monthlyEstimate = rows
    .filter((row) => row.status === "ACTIVE" || row.status === "PAST_DUE")
    .reduce((sum, row) => sum + PLANS[row.plan].priceCentavos, 0);

  const expiringSoon = rows.filter(
    (row) => row.currentPeriodEnd !== null && daysRemaining(row.currentPeriodEnd) <= 7 && daysRemaining(row.currentPeriodEnd) >= 0
  ).length;

  // Filtered against every farm, not just the current page -- pagination
  // slices what's left over after this, never before it.
  const filtered = searchFarms(rows, q);
  const { items: pageRows, page, totalPages, totalItems } = paginate(
    filtered,
    Number(pageParam) || 1,
    ADMIN_PAGE_SIZE
  );

  const pageHref = (targetPage: number): Route => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return (query ? `/admin?${query}` : "/admin") as Route;
  };

  return (
    <PageShell>
      <PageHeader
        title="Subscriptions"
        description="Every farm on the platform, soonest-expiring first."
        action={
          <Link href="/admin/emails" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Mail className="size-4" aria-hidden />
            Email log
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {PLAN_ORDER.map((id) => (
          <Panel key={id} title={PLANS[id].name} bodyClassName="p-4">
            <p className="text-2xl font-bold tabular">{countByPlan[id] ?? 0}</p>
            <p className="text-xs text-muted-foreground">farms</p>
          </Panel>
        ))}
        <Panel title="Est. monthly" bodyClassName="p-4">
          <p className="text-2xl font-bold tabular">{formatCurrency(monthlyEstimate / 100)}</p>
          <p className="text-xs text-muted-foreground">
            active + past due, no proration
          </p>
        </Panel>
        <Panel title="Expiring in 7 days" bodyClassName="p-4">
          <p className="text-2xl font-bold tabular">{expiringSoon}</p>
          <p className="text-xs text-muted-foreground">farms</p>
        </Panel>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="No farms yet" message="Nothing to monitor yet." />
      ) : (
        <>
          <FarmSearch initialQuery={q} />

          <Panel title="All farms" bodyClassName="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No matching farms"
              message={`No farm name or owner email matches "${q}".`}
            />
          ) : (
            <>
              <div className="scroll-x">
                <table className="w-full min-w-[48rem] border-collapse text-sm">
                  <caption className="sr-only">Every farm&apos;s subscription, soonest-expiring first</caption>
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th scope="col" className="p-3 text-left font-medium">Farm</th>
                      <th scope="col" className="p-3 text-left font-medium">Owner</th>
                      <th scope="col" className="p-3 text-left font-medium">Plan</th>
                      <th scope="col" className="p-3 text-left font-medium">Status</th>
                      <th scope="col" className="p-3 text-right font-medium">Renews / expires</th>
                      <th scope="col" className="p-3 text-right font-medium">Days left</th>
                      <th scope="col" className="p-3 text-right font-medium">Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <AdminFarmRow key={row.farmId} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>

              <AdminPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemLabel="farm"
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
