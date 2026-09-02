"use client";

import { useState, useTransition } from "react";
import { Mail, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { formatDate } from "@/lib/format";
import type { SubscriptionStatus } from "@/lib/types/database";
import { emailReceiptAction, sendPastDueReminderAction } from "./billing-actions";

/**
 * Plan summary plus the two manual subscription-email buttons.
 *
 * Not dev-gated, unlike DevPlanSwitcher below it on the page -- this is the
 * real feature. "Send payment reminder" only appears when the farm is
 * actually PAST_DUE, matching what the server action itself refuses.
 */
export function BillingPanel({
  planName,
  price,
  status,
  currentPeriodEnd,
}: {
  planName: string;
  price: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"receipt" | "reminder" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run(action: "receipt" | "reminder") {
    setError(null);
    setSuccess(null);
    setPendingAction(action);

    startTransition(async () => {
      const result =
        action === "receipt" ? await emailReceiptAction() : await sendPastDueReminderAction();

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(action === "receipt" ? "Receipt emailed." : "Reminder sent.");
    });
  }

  return (
    <Panel title="Billing">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium">
            {planName} — {price} / month
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">{status}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Renews</dt>
          <dd className="font-medium">
            {currentPeriodEnd ? formatDate(currentPeriodEnd) : "Not yet set"}
          </dd>
        </div>
      </dl>

      {error && (
        <StatusNote tone="bad" className="mt-4">
          {error}
        </StatusNote>
      )}
      {success && (
        <StatusNote tone="good" className="mt-4">
          {success}
        </StatusNote>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          loading={pending && pendingAction === "receipt"}
          disabled={pending}
          onClick={() => run("receipt")}
        >
          <Mail className="size-4" aria-hidden />
          Email me a receipt
        </Button>

        {status === "PAST_DUE" && (
          <Button
            variant="outline"
            size="sm"
            loading={pending && pendingAction === "reminder"}
            disabled={pending}
            onClick={() => run("reminder")}
          >
            <TriangleAlert className="size-4" aria-hidden />
            Send payment reminder
          </Button>
        )}
      </div>
    </Panel>
  );
}
