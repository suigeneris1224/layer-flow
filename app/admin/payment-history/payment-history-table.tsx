import { formatCurrency, formatDate } from "@/lib/format";
import { PLANS } from "@/lib/subscriptions/plans";
import { cn } from "@/lib/utils";
import type { ManualPaymentHistoryRow } from "@/lib/data/manual-payments";
import type { ManualPaymentStatus } from "@/lib/types/database";

const STATUS_TONE: Record<ManualPaymentStatus, string> = {
  PENDING: "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]",
  APPROVED: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  REJECTED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {children}
    </span>
  );
}

/** Read-only history of every manual payment -- see SubscriptionsTable for the sibling active-review table. */
export function PaymentHistoryTable({ rows }: { rows: ManualPaymentHistoryRow[] }) {
  return (
    <div className="scroll-x-flush">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="sr-only">Every manual payment, newest first</caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="p-3 text-left font-medium">Submitted</th>
            <th scope="col" className="p-3 text-left font-medium">Payer / Farm</th>
            <th scope="col" className="p-3 text-left font-medium">Owner</th>
            <th scope="col" className="p-3 text-left font-medium">Plan</th>
            <th scope="col" className="p-3 text-right font-medium">Amount</th>
            <th scope="col" className="p-3 text-left font-medium">Reference</th>
            <th scope="col" className="p-3 text-left font-medium">Status</th>
            <th scope="col" className="p-3 text-right font-medium">Reviewed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 align-top">
              <td className="p-3 text-left tabular text-muted-foreground">
                {formatDate(row.createdAt)}
              </td>
              <th scope="row" className="p-3 text-left font-medium">
                {row.payerName}
                {row.farmName && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {row.farmName}
                  </span>
                )}
              </th>
              <td className="p-3 text-left text-muted-foreground">{row.ownerEmail ?? "—"}</td>
              <td className="p-3 text-left">
                {PLANS[row.plan].name}
                <span className="block text-xs text-muted-foreground">
                  {row.billingPeriod === "ANNUAL" ? "Annual" : "Monthly"}
                </span>
              </td>
              <td className="p-3 text-right tabular font-medium">
                {formatCurrency(row.amountCentavos / 100)}
              </td>
              <td className="p-3 text-left tabular text-muted-foreground">
                {row.referenceNumber}
              </td>
              <td className="p-3 text-left">
                <Pill tone={STATUS_TONE[row.status]}>{row.status}</Pill>
              </td>
              <td className="p-3 text-right tabular text-muted-foreground">
                {row.reviewedAt ? formatDate(row.reviewedAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
