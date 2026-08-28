import Link from "next/link";
import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import type { SubscriptionPlan } from "@/lib/types/database";

/**
 * Plan summary pinned to the bottom of the sidebar.
 *
 * Reads from lib/subscriptions/plans.ts rather than restating prices, so a
 * pricing change never leaves this card lying.
 */
export function SubscriptionCard({ plan }: { plan: SubscriptionPlan }) {
  const definition = PLANS[plan];

  return (
    <div className="rounded-lg bg-primary/10 p-4">
      <p className="text-xs text-muted-foreground">Current plan</p>
      <p className="mt-0.5 text-lg font-bold text-primary">{definition.name}</p>
      <p className="text-xs text-muted-foreground tabular">
        {formatPlanPrice(definition)} / month
      </p>

      <Link
        href="/pricing"
        className="mt-3 flex min-h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {plan === "PRO" ? "Manage subscription" : "Upgrade plan"}
      </Link>
    </div>
  );
}
