"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Receipt, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { formatCurrency } from "@/lib/format";
import { formatRelativeDay } from "@/lib/format";
import { PLANS } from "@/lib/subscriptions/plans";
import type { PendingManualPaymentRow } from "@/lib/data/manual-payments";
import { adminApproveManualPaymentAction, adminRejectManualPaymentAction } from "./actions";

/** Pending manual QR/bank transfer payments awaiting review -- see app/admin/actions.ts. */
export function ManualPaymentsPanel({ payments }: { payments: PendingManualPaymentRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onApprove(payment: PendingManualPaymentRow) {
    setError(null);
    const confirmed = window.confirm(
      `Approve ${payment.payerName}'s payment and grant ${PLANS[payment.plan].name} ` +
        `(${payment.billingPeriod === "ANNUAL" ? "annual" : "monthly"})?`
    );
    if (!confirmed) return;

    setActingId(payment.id);
    startTransition(async () => {
      const result = await adminApproveManualPaymentAction(payment.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onReject(payment: PendingManualPaymentRow) {
    setError(null);
    const reason = window.prompt("Reason for rejecting this payment (optional):") ?? "";
    const confirmed = window.confirm(`Reject ${payment.payerName}'s payment?`);
    if (!confirmed) return;

    setActingId(payment.id);
    startTransition(async () => {
      const result = await adminRejectManualPaymentAction(payment.id, { reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Panel title="Manual payments awaiting review">
      <div className="flex flex-col gap-3">
        {error && <StatusNote tone="bad">{error}</StatusNote>}

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No manual payments pending review.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-col gap-2 py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{payment.payerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.ownerEmail ?? "Unknown"} · {payment.farmName ?? "No farm"} ·{" "}
                      {formatRelativeDay(payment.createdAt.slice(0, 10))}
                    </p>
                    <p className="mt-1 text-sm">
                      {PLANS[payment.plan].name} —{" "}
                      {formatCurrency(payment.amountCentavos / 100)} /{" "}
                      {payment.billingPeriod === "ANNUAL" ? "year" : "month"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reference: <span className="tabular">{payment.referenceNumber}</span>
                    </p>
                    {payment.receiptSignedUrl && (
                      <a
                        href={payment.receiptSignedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <Receipt className="size-3.5" aria-hidden />
                        View receipt
                      </a>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={pending && actingId === payment.id}
                      disabled={pending}
                      onClick={() => onReject(payment)}
                    >
                      <XCircle className="size-4" aria-hidden />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      loading={pending && actingId === payment.id}
                      disabled={pending}
                      onClick={() => onApprove(payment)}
                    >
                      <CheckCircle2 className="size-4" aria-hidden />
                      Approve &amp; Grant Subscription
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
