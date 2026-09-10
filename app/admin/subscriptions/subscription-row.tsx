"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";
import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import { adminSetSubscriptionAction } from "../actions";

const STATUS_TONE: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  TRIALING: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  PAST_DUE: "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]",
  CANCELED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
  EXPIRED: "bg-[hsl(var(--status-bad))]/15 text-[hsl(var(--status-bad))]",
};

/** Free tier reads as a neutral slate pill; every paid plan reads as the brand green. */
const PLAN_TONE: Record<SubscriptionPlan, string> = {
  FREE: "bg-muted text-muted-foreground",
  STARTER: "bg-primary/15 text-primary",
  PRO: "bg-primary/15 text-primary",
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {children}
    </span>
  );
}

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
 * One account's row: read-only plan/status pills plus two actions -- a
 * one-click "Grant Pro" (skips the modal for the common case: manual GCash/
 * bank payment confirmed, upgrade them to Pro on their current cadence) and
 * "Override" (opens the full plan/status/billing-period form in a modal, for
 * anything the quick action doesn't cover).
 */
export function SubscriptionRow({
  row,
  onOverride,
}: {
  row: AdminAccountRowData;
  onOverride: (row: AdminAccountRowData) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const days = row.currentPeriodEnd ? daysRemaining(row.currentPeriodEnd) : null;
  const farmLabel = row.farmNames.length > 0 ? row.farmNames.join(", ") : "No farms";

  function onGrantPro() {
    setError(null);
    const confirmed = window.confirm(
      `Grant ${row.ownerEmail ?? "this account"} Pro (${formatPlanPrice(PLANS.PRO, row.billingPeriod)} / ` +
        `${row.billingPeriod === "ANNUAL" ? "year" : "month"}), active immediately? ` +
        `This affects every farm on the account (${farmLabel}).`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await adminSetSubscriptionAction(row.ownerId, {
        plan: "PRO",
        status: "ACTIVE",
        billingPeriod: row.billingPeriod,
      });
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
        <Pill tone={PLAN_TONE[row.plan]}>{PLANS[row.plan].name}</Pill>
      </td>
      <td className="p-3 text-left text-muted-foreground">
        {row.billingPeriod === "ANNUAL" ? "Annual" : "Monthly"}
      </td>
      <td className="p-3 text-left">
        <Pill tone={STATUS_TONE[row.status]}>{row.status}</Pill>
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
        <div className="flex justify-end gap-2">
          {row.plan !== "PRO" && (
            <Button size="sm" variant="outline" loading={pending} disabled={pending} onClick={onGrantPro}>
              <Sparkles className="size-4" aria-hidden />
              Grant Pro
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onOverride(row)}>
            <SlidersHorizontal className="size-4" aria-hidden />
            Override
          </Button>
        </div>
        {error && (
          <StatusNote tone="bad" className="mt-2 max-w-[16rem]">
            {error}
          </StatusNote>
        )}
      </td>
    </tr>
  );
}
