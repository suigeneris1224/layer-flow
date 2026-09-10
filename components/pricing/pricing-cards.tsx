"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BillingPeriodToggle } from "./billing-period-toggle";
import { cn } from "@/lib/utils";
import {
  LIMIT_LABELS,
  PLANS,
  PLAN_ORDER,
  annualSavingsPercent,
  describeLimit,
  formatPlanPrice,
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

              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <p className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold tabular">{formatPlanPrice(plan, period)}</span>
                <span className="text-sm text-muted-foreground">
                  /{period === "ANNUAL" ? "year" : "month"}
                </span>
                {savings !== null && (
                  <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs font-medium text-good">
                    Save {savings}%
                  </span>
                )}
              </p>

              <p className="mt-3 text-sm text-muted-foreground">{plan.audience}</p>

              <Link
                href={
                  (id === "FREE" ? "/signup" : `/checkout?plan=${id}&period=${period}`) as Route
                }
                className={cn(
                  buttonVariants({ variant: featured ? "primary" : "outline", block: true }),
                  "mt-5"
                )}
              >
                {id === "FREE" ? "Start free" : `Choose ${plan.name}`}
              </Link>

              <ul className="mt-5 flex flex-col gap-1.5 text-sm">
                {LIMIT_ROWS.filter((key) => plan.limits[key] !== 0).map((key) => (
                  <li key={key} className="flex items-baseline gap-2">
                    <Check className="size-3.5 shrink-0 translate-y-0.5 text-primary" aria-hidden />
                    <span className="tabular">
                      {describeLimit(key, plan.limits[key])}{" "}
                      {plan.limits[key] === 1 ? LIMIT_LABELS[key].singular : LIMIT_LABELS[key].plural}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
