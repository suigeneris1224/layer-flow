import type { Metadata } from "next";
import Link from "next/link";
import { Check, CreditCard, Minus, ShieldCheck } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { PageHero } from "@/components/marketing/page-hero";
import { PhotoSlot } from "@/components/marketing/photo-slot";
import { Section, SectionHeading } from "@/components/marketing/section";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBand } from "@/components/marketing/cta-band";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { faqSchema, pickFaq } from "@/lib/marketing/faq";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/marketing/structured-data";
import {
  FEATURE_LABELS,
  LIMIT_LABELS,
  PLANS,
  PLAN_ORDER,
  describeLimit,
  formatPlanPrice,
  type Feature,
  type LimitKey,
} from "@/lib/subscriptions/plans";
import { cn } from "@/lib/utils";

const DESCRIPTION = `Simple, transparent pricing for Philippine layer farms. Free for one flock, Starter at ${formatPlanPrice(PLANS.STARTER)}/month, Pro at ${formatPlanPrice(PLANS.PRO)}/month. No credit card required.`;

export const metadata: Metadata = {
  title: "Pricing — Plans for Philippine Layer Farms",
  description: DESCRIPTION,
  openGraph: { title: "LayerFlow Pricing", description: DESCRIPTION, url: "/pricing" },
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
  "vaccination_schedule",
  "biosecurity",
  "feed_formulation",
  "weather",
  "flock_comparison",
  "advanced_reports",
  "data_export",
  "team_management",
  "multi_farm",
  "cross_farm_reporting",
  "priority_support",
];

const FAQ = pickFaq([
  "Can I start for free?",
  "How do I pay?",
  "Can I change plans later?",
  "What happens if my subscription lapses?",
]);

export default function PricingPage() {
  return (
    <MarketingPage
      jsonLd={[
        softwareApplicationSchema(),
        faqSchema(FAQ),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]),
      ]}
    >
      <PageHero
        eyebrow="Pricing"
        title="Simple, transparent pricing for layer farmers."
        lead="Choose the plan that fits your farm's needs. Start free, and upgrade anytime as your operation grows."
        media={<PhotoSlot photo="pricingHero" ratio="16/10" priority className="shadow-pop" />}
      />

      <Section innerClassName="pt-10 lg:pt-14">
        <PricingCards />

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-section p-5 sm:flex-row sm:items-start sm:p-6">
          <IconChip icon={CreditCard} tint="teal" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Payment information</p>
            <p className="mt-1 text-muted-foreground">
              Paid plans are prepaid — pay by bank or e-wallet transfer and submit your reference
              number for review. No credit card required, and nothing is ever charged automatically
              without you initiating it.
            </p>
            <Link href="/faq" className="mt-2 inline-block font-medium text-primary-strong hover:underline">
              See full payment details →
            </Link>
          </div>
        </div>
      </Section>

      <Section tone="tint" aria-labelledby="compare-heading">
        <SectionHeading title={<span id="compare-heading">Compare all features</span>} />

        {/* Wide table on a narrow phone: scroll the table, never the page.
            scroll-x-flush gives it the edge-fade "more to see" cue; the
            fade needs to show through an otherwise-transparent table, so
            bg-surface lives on this wrapper rather than the table. */}
        <div className="mt-8 scroll-x-flush rounded-2xl border border-border bg-surface shadow-card">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">Features and limits by plan</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-4 text-left font-semibold">
                  Feature
                </th>
                {PLAN_ORDER.map((id) => (
                  <th
                    key={id}
                    scope="col"
                    className={cn(
                      "p-4 text-center font-semibold",
                      PLANS[id].highlight && "bg-section text-primary-strong"
                    )}
                  >
                    {PLANS[id].name}
                    <span className="block text-xs font-normal tabular text-muted-foreground">
                      {formatPlanPrice(PLANS[id])}/mo
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {LIMIT_ROWS.map((key) => (
                <tr key={key} className="border-b border-border">
                  <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
                    {LIMIT_LABELS[key].plural.replace(/^./, (c) => c.toUpperCase())}
                  </th>
                  {PLAN_ORDER.map((id) => (
                    <td
                      key={id}
                      className={cn("px-4 py-3 text-center tabular", PLANS[id].highlight && "bg-section/60")}
                    >
                      {describeLimit(key, PLANS[id].limits[key])}
                    </td>
                  ))}
                </tr>
              ))}

              {FEATURE_ROWS.map((feature) => (
                <tr key={feature} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
                    {FEATURE_LABELS[feature]}
                  </th>
                  {PLAN_ORDER.map((id) => {
                    const included = PLANS[id].features.includes(feature);
                    return (
                      <td key={id} className={cn("px-4 py-3", PLANS[id].highlight && "bg-section/60")}>
                        <span className="flex justify-center">
                          {included ? (
                            <Check className="size-4 text-primary" aria-hidden />
                          ) : (
                            <Minus className="size-4 text-muted-foreground/50" aria-hidden />
                          )}
                          <span className="sr-only">{included ? "Included" : "Not included"}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
          Changing plan never deletes your records. If you move down, your history stays — you just
          create less new data until you move back up.
        </p>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading title="Plans & billing questions" lead="The short answers. More on the FAQ page." />
          <FaqAccordion items={FAQ} />
        </div>
      </Section>

      <CtaBand
        title="Start free. Upgrade when your farm does."
        lead="One farm, one flock, no credit card — free forever."
        secondary={{ href: "/features", label: "See all features" }}
      />
    </MarketingPage>
  );
}
