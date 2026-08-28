import type { Metadata } from "next";
import Link from "next/link";
import { Check, Egg, Minus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FEATURE_LABELS,
  LIMIT_LABELS,
  PLANS,
  PLAN_ORDER,
  formatPlanPrice,
  type Feature,
  type LimitKey,
} from "@/lib/subscriptions/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans for Philippine layer farms. Start free.",
};

/** Rows of the comparison table, in the order a farmer would ask about them. */
const LIMIT_ROWS: LimitKey[] = ["farms", "houses", "active_flocks", "users", "customers", "history_days"];

const FEATURE_ROWS: Feature[] = [
  "egg_sales",
  "customers",
  "full_expenses",
  "profitability",
  "production_charts",
  "egg_size_analytics",
  "alerts",
  "reports",
  "offline_mode",
  "flock_comparison",
  "advanced_reports",
  "data_export",
  "team_management",
  "multi_farm",
];

function describeLimit(key: LimitKey, value: number | null): string {
  if (value === null) return "Unlimited";
  if (key === "history_days") return `${value} days`;
  if (value === 0) return "—";
  return String(value);
}

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
          <Egg className="size-5 text-primary" aria-hidden />
          LayerFlow
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Sign in
        </Link>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <div className="py-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start free. Move up when your farm does.
          </p>
        </div>

        <section aria-label="Plans" className="grid gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const featured = Boolean(plan.highlight);

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

                <p className="mt-4">
                  <span className="text-3xl font-bold tabular">
                    {formatPlanPrice(plan)}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>

                <p className="mt-3 text-sm text-muted-foreground">{plan.audience}</p>

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
                  {LIMIT_ROWS.filter((key) => plan.limits[key] !== 0).map((key) => (
                    <li key={key} className="flex items-baseline gap-2">
                      <Check className="size-3.5 shrink-0 translate-y-0.5 text-primary" aria-hidden />
                      <span className="tabular">
                        {describeLimit(key, plan.limits[key])}{" "}
                        {plan.limits[key] === 1
                          ? LIMIT_LABELS[key].singular
                          : LIMIT_LABELS[key].plural}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section aria-label="Plan comparison" className="mt-10">
          <h2 className="text-xl font-semibold">Compare plans</h2>

          {/* Wide table on a narrow phone: scroll the table, never the page. */}
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[32rem] border-collapse bg-surface text-sm">
              <caption className="sr-only">Features and limits by plan</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="p-3 text-left font-medium">
                    Feature
                  </th>
                  {PLAN_ORDER.map((id) => (
                    <th key={id} scope="col" className="p-3 text-center font-medium">
                      {PLANS[id].name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {LIMIT_ROWS.map((key) => (
                  <tr key={key} className="border-b border-border">
                    <th scope="row" className="p-3 text-left font-normal">
                      {LIMIT_LABELS[key].plural.replace(/^./, (c) => c.toUpperCase())}
                    </th>
                    {PLAN_ORDER.map((id) => (
                      <td key={id} className="p-3 text-center tabular">
                        {describeLimit(key, PLANS[id].limits[key])}
                      </td>
                    ))}
                  </tr>
                ))}

                {FEATURE_ROWS.map((feature) => (
                  <tr key={feature} className="border-b border-border last:border-0">
                    <th scope="row" className="p-3 text-left font-normal">
                      {FEATURE_LABELS[feature]}
                    </th>
                    {PLAN_ORDER.map((id) => {
                      const included = PLANS[id].features.includes(feature);
                      return (
                        <td key={id} className="p-3">
                          <span className="flex justify-center">
                            {included ? (
                              <Check className="size-4 text-primary" aria-hidden />
                            ) : (
                              <Minus className="size-4 text-muted-foreground/50" aria-hidden />
                            )}
                            <span className="sr-only">
                              {included ? "Included" : "Not included"}
                            </span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Changing plan never deletes your records. If you move down, your history stays — you
            just create less new data until you move back up.
          </p>
        </section>
      </main>
    </div>
  );
}
