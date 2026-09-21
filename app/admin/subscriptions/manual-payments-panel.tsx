"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Receipt, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { formatCurrency } from "@/lib/format";
import { formatRelativeDay } from "@/lib/format";
import { PLANS } from "@/lib/subscriptions/plans";
import type { PendingManualPaymentRow } from "@/lib/data/manual-payments";
import { adminApproveManualPaymentAction, adminRejectManualPaymentAction } from "../actions";
import { safeAction } from "@/lib/client/safe-action";

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
      const result = await safeAction(() => adminApproveManualPaymentAction(payment.id));
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
      const result = await safeAction(() => adminRejectManualPaymentAction(payment.id, { reason }));
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
              <li key={payment.id} className="flex flex-col gap-3 py-3 first:pt-0">
                <div className="flex gap-3">
                  {payment.receiptSignedUrl && (
                    <a
                      href={payment.receiptSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted sm:size-20"
                    >
                      {/^.*\.pdf(\?|$)/i.test(payment.receiptSignedUrl) ? (
                        <FileText className="size-8 text-muted-foreground" aria-hidden />
                      ) : (
                        // A short-lived Supabase signed URL isn't worth next/image's remote-pattern config for a thumbnail this small.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={payment.receiptSignedUrl}
                          alt={`Proof of payment from ${payment.payerName}`}
                          className="size-full object-cover"
                        />
                      )}
                    </a>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{payment.payerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.ownerEmail ?? "Unknown"} · {payment.farmName ?? "No farm"} ·{" "}
                      {formatRelativeDay(payment.createdAt.slice(0, 10))}
                    </p>
                    <p className="mt-1 text-sm">
                      {PLANS[payment.plan].name} —{" "}
                      <span className="font-medium tabular">
                        {formatCurrency(payment.amountCentavos / 100)}
                      </span>{" "}
                      / {payment.billingPeriod === "ANNUAL" ? "year" : "month"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reference: <span className="tabular">{payment.referenceNumber}</span>
                    </p>
                    {payment.paymentNote && (
                      <p className="text-xs text-muted-foreground">
                        Expected note: <span className="tabular">{payment.paymentNote}</span> --
                        compare against GCash&apos;s incoming note.
                      </p>
                    )}
                    {payment.isDuplicateReference && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-bad">
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                        This reference number appears on another payment -- verify before
                        approving.
                      </p>
                    )}
                    {payment.receiptSignedUrl && (
                      <a
                        href={payment.receiptSignedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <Receipt className="size-3.5" aria-hidden />
                        View full receipt
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    className="flex-1 sm:flex-none"
                    loading={pending && actingId === payment.id}
                    disabled={pending}
                    onClick={() => onReject(payment)}
                  >
                    <XCircle className="size-4" aria-hidden />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="md"
                    className="flex-1 sm:flex-none"
                    loading={pending && actingId === payment.id}
                    disabled={pending}
                    onClick={() => onApprove(payment)}
                  >
                    <CheckCircle2 className="size-4" aria-hidden />
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
