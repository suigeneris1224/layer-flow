"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { BillingPeriodToggle } from "./billing-period-toggle";
import {
  FEATURE_LABELS,
  PLANS,
  PLAN_ORDER,
  PLAN_FEATURE_ROWS,
  type BillingPeriod,
} from "@/lib/subscriptions/plans";

/** The landing page's pricing teaser: same toggle as /pricing, a shorter bullet list. */
export function LandingPlanCards() {
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");

  return (
    <div className="flex flex-col items-center gap-6">
      <BillingPeriodToggle period={period} onChange={setPeriod} />

      <div className="grid w-full gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const bullets = PLAN_FEATURE_ROWS[id].map((feature) => FEATURE_LABELS[feature]);

          return (
            <PlanCard
              key={id}
              plan={plan}
              period={period}
              bullets={bullets}
              cta={{
                href: (id === "FREE" ? "/signup" : `/checkout?plan=${id}&period=${period}`) as Route,
                label: id === "FREE" ? "Start free" : `Choose ${plan.name}`,
              }}
              size="compact"
            />
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
