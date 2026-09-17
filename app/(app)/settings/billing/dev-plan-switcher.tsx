"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { PLAN_ORDER, PLANS } from "@/lib/subscriptions/plans";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import { devSetSubscriptionAction } from "./actions";
import { safeAction } from "@/lib/client/safe-action";

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "EXPIRED"];
const BILLING_PERIODS: BillingPeriod[] = ["MONTHLY", "ANNUAL"];

/**
 * Platform-admin tool: flip the current account's plan/status without real
 * billing. Available in production, not just dev -- name/styling are legacy
 * from when this really was dev-only; the actual gate has always been
 * `isPlatformAdmin` (lib/auth/admin.ts), not the environment.
 *
 * Subscriptions are account-wide, so this affects every farm the signed-in
 * account has, not just the one currently open.
 *
 * The page that renders this already checks `isPlatformAdmin` -- a farm
 * OWNER who isn't a platform admin never sees this -- and
 * devSetSubscriptionAction refuses independently too, since a hidden button
 * is not a security boundary.
 */
export function DevPlanSwitcher({
  currentPlan,
  currentStatus,
  currentBillingPeriod,
}: {
  currentPlan: SubscriptionPlan;
  currentStatus: SubscriptionStatus;
  currentBillingPeriod: BillingPeriod;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<SubscriptionPlan>(currentPlan);
  const [status, setStatus] = useState<SubscriptionStatus>(currentStatus);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(currentBillingPeriod);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // `useState(currentPlan)` only reads the prop on mount. This component
  // never unmounts across a `router.refresh()` -- it just receives new props
  // -- so without this the dropdowns would keep showing the pre-switch
  // values even after the database (and everything else) has moved on.
  useEffect(() => {
    setPlan(currentPlan);
    setStatus(currentStatus);
    setBillingPeriod(currentBillingPeriod);
  }, [currentPlan, currentStatus, currentBillingPeriod]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await safeAction(() =>
        devSetSubscriptionAction({ plan, status, billingPeriod })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Plan updated.");
      router.refresh();
    });
  }

  return (
    <Panel title="Developer tools">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <StatusNote tone="warn">
          Visible to platform admins only. Sets the plan directly, bypassing billing, for every
          farm on this account.
        </StatusNote>

        {error && <StatusNote tone="bad">{error}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Plan" htmlFor="dev-plan">
            <Select
              id="dev-plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}
            >
              {PLAN_ORDER.map((id) => (
                <option key={id} value={id}>
                  {PLANS[id].name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Billing" htmlFor="dev-billing-period">
            <Select
              id="dev-billing-period"
              value={billingPeriod}
              onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}
            >
              {BILLING_PERIODS.map((value) => (
                <option key={value} value={value}>
                  {value === "ANNUAL" ? "Annual" : "Monthly"}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status" htmlFor="dev-status">
            <Select
              id="dev-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button type="submit" variant="outline" loading={pending}>
          <FlaskConical className="size-4" aria-hidden />
          {pending ? "Saving…" : "Set plan"}
        </Button>
      </form>
    </Panel>
  );
}
