"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { PLAN_ORDER, PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import { adminSetSubscriptionAction } from "../actions";
import type { AdminAccountRowData } from "./subscription-row";

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "EXPIRED"];
const BILLING_PERIODS: BillingPeriod[] = ["MONTHLY", "ANNUAL"];

/**
 * The full plan/status/billing-period override, for anything the row's
 * one-click "Grant Pro" doesn't cover -- downgrades, status corrections,
 * switching billing cadence. Same write (adminSetSubscriptionAction) the
 * quick action uses, just with every field exposed.
 */
export function OverrideModal({
  row,
  onClose,
}: {
  row: AdminAccountRowData | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<SubscriptionPlan>(row?.plan ?? "FREE");
  const [status, setStatus] = useState<SubscriptionStatus>(row?.status ?? "ACTIVE");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(row?.billingPeriod ?? "MONTHLY");
  const [error, setError] = useState<string | null>(null);

  // Reset the form to whichever row was just opened -- the modal instance is
  // shared across every row, so its state must follow the prop, not persist
  // from the last row someone overrode.
  useEffect(() => {
    if (!row) return;
    setPlan(row.plan);
    setStatus(row.status);
    setBillingPeriod(row.billingPeriod);
    setError(null);
  }, [row]);

  function onSave() {
    if (!row) return;
    setError(null);

    const farmLabel = row.farmNames.length > 0 ? row.farmNames.join(", ") : "No farms";
    const confirmed = window.confirm(
      `Set ${row.ownerEmail ?? "this account"} to ${PLANS[plan].name} / ${status} ` +
        `(${billingPeriod === "ANNUAL" ? "annual" : "monthly"})? ` +
        `This affects every farm on the account (${farmLabel}) immediately.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await adminSetSubscriptionAction(row.ownerId, { plan, status, billingPeriod });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={row !== null} onClose={onClose} title={`Override — ${row?.ownerEmail ?? "account"}`}>
      {row && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="override-plan">Plan</label>
              <Select
                id="override-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}
              >
                {PLAN_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {PLANS[id].name} — {formatPlanPrice(PLANS[id], billingPeriod)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="override-billing">Billing period</label>
              <Select
                id="override-billing"
                value={billingPeriod}
                onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}
              >
                {BILLING_PERIODS.map((value) => (
                  <option key={value} value={value}>
                    {value === "ANNUAL" ? "Annual" : "Monthly"}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="override-status">Status</label>
            <Select
              id="override-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          {error && <StatusNote tone="bad">{error}</StatusNote>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" loading={pending} onClick={onSave}>
              <Save className="size-4" aria-hidden />
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
