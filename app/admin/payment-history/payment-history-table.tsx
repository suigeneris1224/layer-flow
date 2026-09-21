import { formatCurrency, formatDate } from "@/lib/format";
import { PLANS } from "@/lib/subscriptions/plans";
import { cn } from "@/lib/utils";
import type { PaymentHistoryRow } from "@/lib/domain/payment-history";

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]",
  APPROVED: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  PAID: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  REJECTED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
  FAILED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
  EXPIRED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
};

const SOURCE_LABEL: Record<PaymentHistoryRow["source"], string> = {
  manual: "Manual",
  paymongo: "GCash (PayMongo)",
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {children}
    </span>
  );
}

/** Read-only history of every payment, manual and automated together -- see SubscriptionsTable for the sibling active-review table. */
export function PaymentHistoryTable({ rows }: { rows: PaymentHistoryRow[] }) {
  return (
    <div className="scroll-x-flush">
      <table className="w-full min-w-[60rem] border-collapse text-sm">
        <caption className="sr-only">Every payment, newest first</caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="p-3 text-left font-medium">Submitted</th>
            <th scope="col" className="p-3 text-left font-medium">Payer / Farm</th>
            <th scope="col" className="p-3 text-left font-medium">Owner</th>
            <th scope="col" className="p-3 text-left font-medium">Source</th>
            <th scope="col" className="p-3 text-left font-medium">Plan</th>
            <th scope="col" className="p-3 text-right font-medium">Amount</th>
            <th scope="col" className="p-3 text-left font-medium">Reference</th>
            <th scope="col" className="p-3 text-left font-medium">Status</th>
            <th scope="col" className="p-3 text-right font-medium">Settled</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.source}-${row.id}`} className="border-b border-border last:border-0 align-top">
              <td className="p-3 text-left tabular text-muted-foreground">
                {formatDate(row.createdAt)}
              </td>
              <th scope="row" className="p-3 text-left font-medium">
                {row.payerName ?? row.ownerEmail ?? "—"}
                {row.farmName && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {row.farmName}
                  </span>
                )}
              </th>
              <td className="p-3 text-left text-muted-foreground">{row.ownerEmail ?? "—"}</td>
              <td className="p-3 text-left text-muted-foreground">{SOURCE_LABEL[row.source]}</td>
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
                {row.referenceNumber ?? "—"}
              </td>
              <td className="p-3 text-left">
                <Pill tone={STATUS_TONE[row.status] ?? "bg-muted text-muted-foreground"}>
                  {row.status}
                </Pill>
              </td>
              <td className="p-3 text-right tabular text-muted-foreground">
                {row.settledAt ? formatDate(row.settledAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
