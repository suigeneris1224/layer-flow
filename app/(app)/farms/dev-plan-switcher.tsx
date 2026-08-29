"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { PLAN_ORDER, PLANS } from "@/lib/subscriptions/plans";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import { devSetSubscriptionAction } from "./actions";

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "EXPIRED"];

/**
 * Development-only: flip the active farm's plan/status without real billing.
 *
 * The page that renders this already checks `isProduction`, so this component
 * never ships to a live site -- but the styling still marks it as scaffolding
 * rather than a real settings control, in case anyone stumbles onto it in a
 * preview/staging build.
 */
export function DevPlanSwitcher({
  currentPlan,
  currentStatus,
}: {
  currentPlan: SubscriptionPlan;
  currentStatus: SubscriptionStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState<SubscriptionPlan>(currentPlan);
  const [status, setStatus] = useState<SubscriptionStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // `useState(currentPlan)` only reads the prop on mount. This component
  // never unmounts across a `router.refresh()` -- it just receives new props
  // -- so without this the dropdowns would keep showing the pre-switch
  // values even after the database (and everything else) has moved on.
  useEffect(() => {
    setPlan(currentPlan);
    setStatus(currentStatus);
  }, [currentPlan, currentStatus]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await devSetSubscriptionAction({ plan, status });
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
          Visible in development only — never shown in production. Sets the plan directly,
          bypassing billing.
        </StatusNote>

        {error && <StatusNote tone="bad">{error}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <div className="grid grid-cols-2 gap-3">
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
