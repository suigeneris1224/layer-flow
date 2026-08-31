import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PhilippinePeso } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageSales } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getOutstandingTotal, getSales, getSalesCount, type SaleEntry } from "@/lib/data/sales";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatNumber, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExportMenu } from "@/components/export/export-menu";
import { ExportNotice } from "@/lib/export/notices";
import { PaymentBadge } from "./payment-badge";

export const metadata: Metadata = { title: "Sales" };

export const dynamic = "force-dynamic";

const SALES_PER_PAGE = 10;

/** "10 trays + 5 eggs Large", the way a farmer would say it. */
function describeLines(sale: SaleEntry): string {
  return sale.lines
    .map((line) => {
      const parts: string[] = [];
      if (line.quantityTrays > 0) {
        parts.push(`${formatNumber(line.quantityTrays)} ${line.quantityTrays === 1 ? "tray" : "trays"}`);
      }
      if (line.quantityEggs > 0) {
        parts.push(`${formatNumber(line.quantityEggs)} ${line.quantityEggs === 1 ? "egg" : "eggs"}`);
      }
      return `${parts.join(" + ")} ${line.sizeName}`;
    })
    .join(", ");
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; export?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "egg_sales")) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Sales"
          description="Record what you sell and see what you are still owed."
        />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "egg_sales")} />
      </PageShell>
    );
  }

  const { page: pageParam, export: exportReason } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [sales, salesCount, outstanding] = await Promise.all([
    getSales(context, { limit: SALES_PER_PAGE, offset: (page - 1) * SALES_PER_PAGE }),
    getSalesCount(context),
    getOutstandingTotal(context),
  ]);

  const totalPages = Math.max(1, Math.ceil(salesCount / SALES_PER_PAGE));
  const canSell = canManageSales(context);

  return (
    <PageShell>
      <PageHeader
        title="Sales"
        description="What you sold, and what is still owed to you."
        action={
          canSell ? (
            <div className="flex flex-wrap items-center gap-2">
              <ExportMenu
                action="/api/export/sales"
                label="Sales"
                locked={!canAccess(entitlement, "data_export")}
              />
              <Link href="/sales/new" className={cn(buttonVariants({ size: "md" }))}>
                <PhilippinePeso className="size-4" aria-hidden />
                Record a sale
              </Link>
            </div>
          ) : undefined
        }
      />

      <ExportNotice reason={exportReason} />

      {outstanding > 0 && (
        <StatusNote tone="warn" title={`${formatCurrency(outstanding, context.currency)} still owed`}>
          Across the unpaid and part-paid sales below.
        </StatusNote>
      )}

      {salesCount === 0 ? (
        <EmptyState
          icon={PhilippinePeso}
          title="No sales yet"
          message="Record your first sale and your revenue starts showing on the dashboard."
          actionLabel={canSell ? "Record a sale" : undefined}
          actionHref={canSell ? "/sales/new" : undefined}
        />
      ) : (
        <Panel title="Recent sales">
          <ul className="flex flex-col divide-y divide-border">
            {sales.map((sale) => (
              <li
                key={sale.id}
                className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {sale.customerName ?? "Walk-in"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatRelativeDay(sale.saleDate, context.timezone)}
                    {sale.lines.length > 0 && ` · ${describeLines(sale)}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap sm:shrink-0">
                  {sale.outstanding > 0 && (
                    <span className="text-xs tabular text-muted-foreground">
                      {formatCurrency(sale.outstanding, context.currency)} owed
                    </span>
                  )}
                  <PaymentBadge status={sale.paymentStatus} />
                  <span className="ml-auto text-right text-sm font-semibold tabular sm:ml-0 sm:w-24">
                    {formatCurrency(sale.totalAmount, context.currency)}
                  </span>
                  {canSell && sale.outstanding > 0 && (
                    <Link
                      href={`/sales/${sale.id}/payment`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "w-full justify-center sm:w-auto"
                      )}
                    >
                      Record payment
                    </Link>
                  )}
                </div>
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
                  href={page > 1 ? `/sales?page=${page - 1}` : "/sales"}
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
                  href={`/sales?page=${page + 1}`}
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
