import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageSales } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getOutstandingTotal, getSales, type SaleEntry } from "@/lib/data/sales";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatNumber, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PaymentBadge } from "./payment-badge";

export const metadata: Metadata = { title: "Sales" };

export const dynamic = "force-dynamic";

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

export default async function SalesPage() {
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

  const [sales, outstanding] = await Promise.all([
    getSales(context),
    getOutstandingTotal(context),
  ]);

  const canSell = canManageSales(context);

  return (
    <PageShell>
      <PageHeader
        title="Sales"
        description="What you sold, and what is still owed to you."
        action={
          canSell ? (
            <Link href="/sales/new" className={cn(buttonVariants({ size: "md" }))}>
              <ShoppingCart className="size-4" aria-hidden />
              Record a sale
            </Link>
          ) : undefined
        }
      />

      {outstanding > 0 && (
        <StatusNote tone="warn" title={`${formatCurrency(outstanding, context.currency)} still owed`}>
          Across the unpaid and part-paid sales below.
        </StatusNote>
      )}

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales yet"
          message="Record your first sale and your revenue starts showing on the dashboard."
          actionLabel={canSell ? "Record a sale" : undefined}
          actionHref={canSell ? "/sales/new" : undefined}
        />
      ) : (
        <Panel title="Recent sales">
          <ul className="flex flex-col divide-y divide-border">
            {sales.map((sale) => (
              <li key={sale.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {sale.customerName ?? "Walk-in"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatRelativeDay(sale.saleDate, context.timezone)}
                    {sale.lines.length > 0 && ` · ${describeLines(sale)}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {sale.outstanding > 0 && (
                    <span className="text-xs tabular text-muted-foreground">
                      {formatCurrency(sale.outstanding, context.currency)} owed
                    </span>
                  )}
                  <PaymentBadge status={sale.paymentStatus} />
                  <span className="w-24 text-right text-sm font-semibold tabular">
                    {formatCurrency(sale.totalAmount, context.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PageShell>
  );
}
