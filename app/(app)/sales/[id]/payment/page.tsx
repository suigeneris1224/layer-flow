import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageSales } from "@/lib/auth/permissions";
import { getSale } from "@/lib/data/sales";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { formatCurrency, formatRelativeDay } from "@/lib/format";
import { PaymentBadge } from "../../payment-badge";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "Record a payment" };

export const dynamic = "force-dynamic";

export default async function SalePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireFarmContext();
  const sale = await getSale(context, id);

  if (!sale) notFound();

  if (!canManageSales(context)) {
    return (
      <PageShell width="reading">
        <PageHeader title="Record a payment" />
        <StatusNote tone="info">
          Only the farm owner or a manager can record payments.
        </StatusNote>
      </PageShell>
    );
  }

  return (
    <PageShell width="reading">
      <PageHeader
        title="Record a payment"
        description={`${sale.customerName ?? "Walk-in"} · ${formatRelativeDay(sale.saleDate, context.timezone)}`}
      />

      <Panel title="Sale summary">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium tabular">
              {formatCurrency(sale.totalAmount, context.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Already paid</span>
            <span className="font-medium tabular">
              {formatCurrency(sale.amountPaid, context.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="font-semibold tabular">
              {formatCurrency(sale.outstanding, context.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Status</span>
            <PaymentBadge status={sale.paymentStatus} />
          </div>
        </div>
      </Panel>

      {sale.outstanding <= 0 ? (
        <StatusNote tone="good" title="This sale is fully paid">
          There is nothing left to record.
        </StatusNote>
      ) : (
        <PaymentForm
          saleId={sale.id}
          outstanding={sale.outstanding}
          currency={context.currency}
        />
      )}
    </PageShell>
  );
}
