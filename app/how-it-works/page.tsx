import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Egg, PhilippinePeso, TrendingUp, Wheat, WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { PageHero } from "@/components/marketing/page-hero";
import { PhotoSlot } from "@/components/marketing/photo-slot";
import { Section, SectionHeading } from "@/components/marketing/section";
import { MockupThumb } from "@/components/marketing/mockup-thumb";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { Reveal } from "@/components/marketing/reveal";
import { PlanBadge } from "@/components/marketing/plan-badge";
import { ProductionMockup } from "@/components/marketing/production-mockup";
import { MoneyMockup } from "@/components/marketing/money-mockup";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";
import { NotificationsMockup } from "@/components/marketing/notifications-mockup";
import { MobileMockup } from "@/components/marketing/mobile-mockup";
import { faqSchema, pickFaq } from "@/lib/marketing/faq";
import { breadcrumbSchema } from "@/lib/marketing/structured-data";
import {
  costPerEgg,
  costPerKgFromSack,
  feedCost,
  feedCostPerEgg,
  layingRate,
  operatingProfit,
} from "@/lib/domain/calculations";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "How LayerFlow turns your daily egg count, feed, sales, and expenses into laying rate, cost per egg, and estimated operating profit — in four simple steps.";

export const metadata: Metadata = {
  title: "How It Works — From Egg Collection to Farm Profit",
  description: DESCRIPTION,
  openGraph: { title: "How LayerFlow Works", description: DESCRIPTION, url: "/how-it-works" },
};

const STEPS = [
  {
    title: "Record production",
    copy: "Log the morning collection in under a minute — eggs collected, broken and dirty counts, and a breakdown by size. Mortality and vaccinations go in alongside it, so the day's full picture is in one place.",
    mockup: <ProductionMockup />,
  },
  {
    title: "Track feed & expenses",
    copy: "Feed and expenses are logged against the day they happened. Price feed per kilo or by the sack — give LayerFlow the sack size and price and it works out the cost per kilo for you.",
    mockup: <FeedMockup />,
  },
  {
    title: "Record sales",
    copy: "Record sales as they happen — by tray or by egg, to a customer on file or a walk-in, paid in full or on credit. Egg stock updates automatically.",
    mockup: <MoneyMockup />,
  },
  {
    title: "Review performance",
    copy: "Reports turn the daily numbers into trends — laying rate, cost per egg, profit over time. Alerts flag a production drop before it becomes a real problem.",
    mockup: <DashboardMockup />,
  },
];

// One worked day, computed with the app's own formulas so the page can
// never show a number the product wouldn't.
const HENS = 1_000;
const EGGS = 870;
const FEED_KG = 115;
const MONTH_REVENUE = 176_500;
const MONTH_COSTS = 119_300;
const MONTH_EGGS = 19_560;
const SACK_PRICE = 1_450;
const SACK_KG = 50;
const FEED_PER_KG = costPerKgFromSack(SACK_PRICE, SACK_KG);
const dayFeedCost = feedCost(FEED_KG, FEED_PER_KG);

const METRICS = [
  {
    icon: Egg,
    title: "Laying rate",
    formula: "Eggs collected ÷ hens present × 100",
    example: `${formatNumber(EGGS)} ÷ ${formatNumber(HENS)} = ${formatPercent(layingRate(EGGS, HENS))}`,
    href: "/blog/how-to-calculate-laying-rate",
  },
  {
    icon: Wheat,
    title: "Feed cost per egg",
    formula: "Feed cost ÷ eggs collected",
    example: `${formatCurrency(dayFeedCost)} ÷ ${formatNumber(EGGS)} = ${formatCurrency(feedCostPerEgg(dayFeedCost, EGGS))}`,
    href: "/blog/how-to-track-feed-costs-by-the-sack",
  },
  {
    icon: PhilippinePeso,
    title: "Cost per egg",
    formula: "Operating costs ÷ eggs produced",
    example: `${formatCurrency(MONTH_COSTS)} ÷ ${formatNumber(MONTH_EGGS)} = ${formatCurrency(costPerEgg(MONTH_COSTS, MONTH_EGGS))}`,
    href: "/blog/how-to-calculate-cost-per-egg",
  },
  {
    icon: TrendingUp,
    title: "Operating profit",
    formula: "Revenue − operating costs",
    example: `${formatCurrency(MONTH_REVENUE)} − ${formatCurrency(MONTH_COSTS)} = ${formatCurrency(operatingProfit(MONTH_REVENUE, MONTH_COSTS))}`,
    href: "/blog/reading-your-farms-operating-profit",
  },
] as const;

const FAQ = pickFaq([
  "Who is LayerFlow for?",
  "Can I start for free?",
  "Does LayerFlow work offline?",
  "Can I record feed cost by the sack?",
  "Can multiple people use one farm?",
]);

export default function HowItWorksPage() {
  return (
    <MarketingPage
      jsonLd={[
        faqSchema(FAQ),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "How It Works", path: "/how-it-works" },
        ]),
      ]}
    >
      <PageHero
        eyebrow="How it works"
        title="See how your farm's daily numbers come together."
        lead="From egg collection to estimated operating profit, LayerFlow helps you organize your farm's records in one simple workflow."
        actions={
          <Link href="/signup" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
            Start free
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
        media={
          <PhotoSlot photo="howItWorksHero" ratio="16/10" priority className="shadow-pop">
            <div className="absolute bottom-4 right-4 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-pop backdrop-blur">
              <p className="text-xs text-muted-foreground">Today&apos;s laying rate</p>
              <p className="text-2xl font-bold tabular text-primary">{formatPercent(layingRate(EGGS, HENS))}</p>
            </div>
          </PhotoSlot>
        }
      />

      {/* The 4-step workflow */}
      <Section>
        <SectionHeading eyebrow="The 4-step workflow" title="Four steps, in the order a farm day runs." />

        <ol className="relative mt-12 flex flex-col gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative grid gap-4 sm:grid-cols-[3rem_1fr]">
              {index < STEPS.length - 1 && (
                <span
                  className="absolute left-6 top-14 hidden h-[calc(100%-2rem)] w-px bg-border sm:block"
                  aria-hidden
                />
              )}
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-card">
                {index + 1}
              </span>
              <Reveal>
                <div className="grid items-center gap-5 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 md:grid-cols-[1fr_17rem] lg:grid-cols-[1fr_20rem]">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{step.copy}</p>
                  </div>
                  <MockupThumb className="hidden sm:block">{step.mockup}</MockupThumb>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </Section>

      {/* How the numbers work */}
      <Section tone="tint">
        <SectionHeading
          eyebrow="How the numbers work"
          title="No black box. Here's the maths."
          lead="Every figure LayerFlow shows comes from a simple, standard formula — worked through here with one example farm."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <div key={metric.title} className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card">
              <IconChip icon={metric.icon} tint="green" />
              <h3 className="mt-4 font-semibold text-foreground">{metric.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{metric.formula}</p>
              <p className="mt-4 rounded-lg bg-section px-3 py-2 text-xs font-medium tabular text-foreground">
                {metric.example}
              </p>
              <Link
                href={metric.href}
                className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary-strong hover:underline"
              >
                Read the guide
                <span className="sr-only"> on {metric.title.toLowerCase()}</span>
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Operating profit is an estimate: it excludes depreciation, owner&apos;s draw, and financing
          costs.
        </p>
      </Section>

      {/* Offline */}
      <Section>
        <div className="grid items-center gap-8 overflow-hidden rounded-2xl border border-border bg-section p-6 sm:p-10 md:grid-cols-[1fr_16rem]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <IconChip icon={WifiOff} tint="rose" />
              <PlanBadge feature="offline_mode" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              Offline? No problem.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Production, feed, and mortality keep recording with no signal. Entries are saved on
              your phone and sync automatically once you&apos;re back online — and if the same day
              was recorded on another device, LayerFlow asks you which to keep instead of guessing.
            </p>
            <p className="mt-5 text-sm">
              <Link href="/docs#offline" className="font-medium text-primary-strong hover:underline">
                Learn more about offline recording →
              </Link>
            </p>
          </div>
          <div className="hidden md:block">
            <MobileMockup>
              <p className="rounded-md bg-chip-amber px-2 py-1 text-[11px] font-medium text-chip-amber-fg">
                Offline — 2 entries waiting
              </p>
              <div className="mt-3 flex flex-col gap-2 text-xs">
                <div className="rounded-md border border-border px-2.5 py-1.5">Eggs collected · 820</div>
                <div className="rounded-md border border-border px-2.5 py-1.5">Feed used · 115 kg</div>
              </div>
              <div className="mt-3 rounded-md bg-primary py-2 text-center text-[11px] font-medium text-primary-foreground">
                Saved on this phone
              </div>
            </MobileMockup>
          </div>
        </div>
      </Section>

      {/* Alerts strip */}
      <Section tone="tint" innerClassName="lg:py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <SectionHeading
            title="Catch problems while they're still small."
            lead="Alerts watch your numbers for you — a production drop, mortality above normal, or an overdue vaccination shows up on the bell, not at month-end."
          />
          <NotificationsMockup />
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <SectionHeading title="Common questions" />
            <p className="mt-6 text-sm">
              <Link href="/faq" className="font-medium text-primary-strong hover:underline">
                View all FAQs →
              </Link>
            </p>
          </div>
          <FaqAccordion items={FAQ} />
        </div>
      </Section>

      <CtaBand
        title="See your own numbers come together."
        lead="Start free with one flock. No credit card required."
        secondary={{ href: "/features", label: "See all features" }}
      />
    </MarketingPage>
  );
}

/** Feed entry by the sack -- a coded recreation, same approach as the other mockups. */
function FeedMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>
      <div className="grid grid-cols-3 gap-2 p-4 text-xs">
        {[
          ["Sack size", `${SACK_KG} kg`],
          ["Sack price", formatCurrency(SACK_PRICE)],
          ["Cost per kg", formatCurrency(FEED_PER_KG)],
          ["Feed used", `${FEED_KG} kg`],
          ["Hens", formatNumber(HENS)],
          ["Feed cost", formatCurrency(dayFeedCost)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="font-semibold tabular">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
