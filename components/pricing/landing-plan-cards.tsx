"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BillingPeriodToggle } from "./billing-period-toggle";
import { cn } from "@/lib/utils";
import {
  FEATURE_LABELS,
  PLANS,
  PLAN_ORDER,
  annualSavingsPercent,
  formatPlanPrice,
  type BillingPeriod,
  type Feature,
} from "@/lib/subscriptions/plans";

/** A curated few bullets per plan, not the full feature list -- see /pricing for that. */
const PLAN_FEATURE_ROWS: Record<string, Feature[]> = {
  FREE: ["production_charts"],
  STARTER: ["egg_sales", "full_expenses", "egg_size_analytics", "alerts", "reports"],
  PRO: ["team_management", "multi_farm", "cross_farm_reporting", "priority_support"],
};

/** The landing page's pricing teaser: same toggle as /pricing, a shorter bullet list. */
export function LandingPlanCards() {
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");

  return (
    <div className="flex flex-col items-center gap-6">
      <BillingPeriodToggle period={period} onChange={setPeriod} />

      <div className="grid w-full gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const featured = Boolean(plan.highlight);
          const savings = period === "ANNUAL" ? annualSavingsPercent(plan) : null;

          return (
            <div
              key={id}
              className={cn(
                "flex flex-col rounded-lg border bg-surface p-5",
                featured ? "border-primary shadow-card ring-1 ring-primary" : "border-border"
              )}
            >
              {plan.highlight && (
                <span className="mb-2 self-start rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  {plan.highlight}
                </span>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <p className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold tabular">{formatPlanPrice(plan, period)}</span>
                <span className="text-sm text-muted-foreground">
                  /{period === "ANNUAL" ? "year" : "month"}
                </span>
                {savings !== null && (
                  <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs font-medium text-good">
                    Save {savings}%
                  </span>
                )}
              </p>

              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: featured ? "primary" : "outline", block: true }),
                  "mt-5"
                )}
              >
                {id === "FREE" ? "Start free" : `Choose ${plan.name}`}
              </Link>

              <ul className="mt-5 flex flex-col gap-1.5 text-sm">
                {PLAN_FEATURE_ROWS[id]?.map((feature) => (
                  <li key={feature} className="flex items-baseline gap-2">
                    <Check className="size-3.5 shrink-0 translate-y-0.5 text-primary" aria-hidden />
                    <span>{FEATURE_LABELS[feature]}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm">
        <Link href="/pricing" className="font-medium text-primary hover:underline">
          See full plan comparison
        </Link>
      </p>
    </div>
  );
}
