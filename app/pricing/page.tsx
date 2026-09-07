import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PricingCards } from "@/components/pricing/pricing-cards";
import {
  FEATURE_LABELS,
  LIMIT_LABELS,
  PLANS,
  PLAN_ORDER,
  describeLimit,
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
  "cross_farm_reporting",
  "priority_support",
];

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <div className="py-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start free. Move up when your farm does.
          </p>
        </div>

        <PricingCards />

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

      <PublicFooter />
    </div>
  );
}
