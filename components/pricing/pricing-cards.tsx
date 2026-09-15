"use client";

import { useState } from "react";
import type { Route } from "next";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { BillingPeriodToggle } from "./billing-period-toggle";
import {
  LIMIT_LABELS,
  PLANS,
  PLAN_ORDER,
  describeLimit,
  type BillingPeriod,
  type LimitKey,
} from "@/lib/subscriptions/plans";

const LIMIT_ROWS: LimitKey[] = [
  "farms",
  "houses",
  "active_flocks",
  "users",
  "customers",
  "history_days",
];

/** The /pricing page's plan cards, with a monthly/annual toggle. */
export function PricingCards() {
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");

  return (
    <div className="flex flex-col items-center gap-6">
      <BillingPeriodToggle period={period} onChange={setPeriod} />

      <section aria-label="Plans" className="grid w-full gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const bullets = LIMIT_ROWS.filter((key) => plan.limits[key] !== 0).map((key) => {
            const value = plan.limits[key];
            const label = value === 1 ? LIMIT_LABELS[key].singular : LIMIT_LABELS[key].plural;
            return `${describeLimit(key, value)} ${label}`;
          });

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
            />
          );
        })}
      </section>
    </div>
  );
}
