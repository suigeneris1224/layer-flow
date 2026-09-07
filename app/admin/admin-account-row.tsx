"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { PLAN_ORDER, PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import { adminSetSubscriptionAction } from "./actions";

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "EXPIRED"];
const BILLING_PERIODS: BillingPeriod[] = ["MONTHLY", "ANNUAL"];

const STATUS_TONE: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  TRIALING: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  PAST_DUE: "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]",
  CANCELED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
  EXPIRED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
};

/** Whole days from now to `end`, negative when already past. */
function daysRemaining(end: string): number {
  const ms = new Date(end).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export interface AdminAccountRowData {
  ownerId: string;
  ownerEmail: string | null;
  farmNames: string[];
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodEnd: string | null;
}

/**
 * One account's row on /admin, with the plan/status cells made editable.
 *
 * Subscriptions are account-wide: saving here changes the plan for every farm
 * this account owns at once, not just one of them -- see
 * app/(app)/billing/dev-plan-switcher.tsx for the self-service equivalent,
 * and app/admin/actions.ts's adminSetSubscriptionAction for the write.
 */
export function AdminAccountRow({ row }: { row: AdminAccountRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<SubscriptionPlan>(row.plan);
  const [status, setStatus] = useState<SubscriptionStatus>(row.status);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(row.billingPeriod);
  const [error, setError] = useState<string | null>(null);

  // This component never unmounts across router.refresh() -- it just
  // receives new props -- so without this the selects would keep showing
  // the pre-save values even after the database has moved on. Same fix
  // dev-plan-switcher.tsx already needed for the same reason.
  useEffect(() => {
    setPlan(row.plan);
    setStatus(row.status);
    setBillingPeriod(row.billingPeriod);
  }, [row.plan, row.status, row.billingPeriod]);

  const dirty = plan !== row.plan || status !== row.status || billingPeriod !== row.billingPeriod;
  const days = row.currentPeriodEnd ? daysRemaining(row.currentPeriodEnd) : null;
  const farmLabel = row.farmNames.length > 0 ? row.farmNames.join(", ") : "No farms";

  function onSave() {
    setError(null);

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
    });
  }

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <th scope="row" className="p-3 text-left font-medium">
        {farmLabel}
      </th>
      <td className="p-3 text-left text-muted-foreground">{row.ownerEmail ?? "—"}</td>

      <td className="p-3 text-left">
        <Select
          fit
          aria-label={`Plan for ${row.ownerEmail ?? row.ownerId}`}
          value={plan}
          onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}
        >
          {PLAN_ORDER.map((id) => (
            <option key={id} value={id}>
              {PLANS[id].name} — {formatPlanPrice(PLANS[id], billingPeriod)}
            </option>
          ))}
        </Select>
      </td>

      <td className="p-3 text-left">
        <Select
          fit
          aria-label={`Billing period for ${row.ownerEmail ?? row.ownerId}`}
          value={billingPeriod}
          onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}
        >
          {BILLING_PERIODS.map((value) => (
            <option key={value} value={value}>
              {value === "ANNUAL" ? "Annual" : "Monthly"}
            </option>
          ))}
        </Select>
      </td>

      <td className="p-3 text-left">
        <Select
          fit
          aria-label={`Status for ${row.ownerEmail ?? row.ownerId}`}
          value={status}
          onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <span
          className={cn(
            "ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium align-middle",
            STATUS_TONE[row.status]
          )}
        >
          current: {row.status}
        </span>
      </td>

      <td className="p-3 text-right tabular">
        {row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : "Not set"}
      </td>
      <td
        className={cn(
          "p-3 text-right tabular",
          days !== null && days < 0 && "font-medium text-[hsl(var(--status-bad))]"
        )}
      >
        {days === null ? "—" : days}
      </td>

      <td className="p-3 text-right">
        <Button
          size="sm"
          variant={dirty ? "primary" : "outline"}
          loading={pending}
          disabled={!dirty}
          onClick={onSave}
        >
          <Save className="size-4" aria-hidden />
          Save
        </Button>
        {error && (
          <StatusNote tone="bad" className="mt-2 max-w-[16rem]">
            {error}
          </StatusNote>
        )}
      </td>
    </tr>
  );
}
