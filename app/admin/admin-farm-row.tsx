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
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import { adminSetSubscriptionAction } from "./actions";

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "EXPIRED"];

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

export interface AdminFarmRowData {
  farmId: string;
  farmName: string;
  ownerEmail: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

/**
 * One farm's row on /admin, with the plan/status cells made editable.
 *
 * A production-safe stand-in for app/(app)/billing/dev-plan-switcher.tsx,
 * usable on any farm rather than only the caller's own -- see
 * app/admin/actions.ts's adminSetSubscriptionAction.
 */
export function AdminFarmRow({ row }: { row: AdminFarmRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<SubscriptionPlan>(row.plan);
  const [status, setStatus] = useState<SubscriptionStatus>(row.status);
  const [error, setError] = useState<string | null>(null);

  // This component never unmounts across router.refresh() -- it just
  // receives new props -- so without this the selects would keep showing
  // the pre-save values even after the database has moved on. Same fix
  // dev-plan-switcher.tsx already needed for the same reason.
  useEffect(() => {
    setPlan(row.plan);
    setStatus(row.status);
  }, [row.plan, row.status]);

  const dirty = plan !== row.plan || status !== row.status;
  const days = row.currentPeriodEnd ? daysRemaining(row.currentPeriodEnd) : null;

  function onSave() {
    setError(null);

    const confirmed = window.confirm(
      `Set ${row.farmName} to ${PLANS[plan].name} / ${status}? This takes effect immediately.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await adminSetSubscriptionAction(row.farmId, { plan, status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <th scope="row" className="p-3 text-left font-medium">{row.farmName}</th>
      <td className="p-3 text-left text-muted-foreground">{row.ownerEmail ?? "—"}</td>

      <td className="p-3 text-left">
        <Select
          fit
          aria-label={`Plan for ${row.farmName}`}
          value={plan}
          onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}
        >
          {PLAN_ORDER.map((id) => (
            <option key={id} value={id}>
              {PLANS[id].name} — {formatPlanPrice(PLANS[id])}
            </option>
          ))}
        </Select>
      </td>

      <td className="p-3 text-left">
        <Select
          fit
          aria-label={`Status for ${row.farmName}`}
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
