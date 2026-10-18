import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Egg,
  Layers,
  Minus,
  PhilippinePeso,
  Smartphone,
  Syringe,
  ThermometerSun,
  TrendingUp,
  Users,
  Wallet,
  Wheat,
  WifiOff,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { Section, SectionHeading, Eyebrow } from "@/components/marketing/section";
import { FeatureCard } from "@/components/marketing/feature-card";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";
import { MobileMockup } from "@/components/marketing/mobile-mockup";
import { Reveal } from "@/components/marketing/reveal";
import { TestimonialSection } from "@/components/marketing/testimonial";
import { UsageStats } from "@/components/marketing/usage-stats";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { LandingPlanCards } from "@/components/pricing/landing-plan-cards";
import { faqSchema, pickFaq } from "@/lib/marketing/faq";
import { softwareApplicationSchema, websiteSchema } from "@/lib/marketing/structured-data";
import { layingRate, operatingProfit, sellableEggs, eggsToTrays, costPerEgg } from "@/lib/domain/calculations";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { Feature } from "@/lib/subscriptions/plans";
import { cn } from "@/lib/utils";

const TITLE = "LayerFlow — Poultry Layer Farm Management Software";
const DESCRIPTION =
  "LayerFlow helps Philippine layer farmers track egg production, feed, expenses, sales, and profitability in one simple farm management app. Start free.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "LayerFlow",
    locale: "en_PH",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const TRUST = [
  { icon: CheckCircle2, title: "Free plan available", copy: "No credit card required" },
  { icon: PhilippinePeso, title: "Philippine peso pricing", copy: "Local units and trays" },
  { icon: Layers, title: "For layer farms", copy: "100–5,000 hens" },
];

const PROBLEMS = [
  {
    icon: ClipboardList,
    tint: "rose" as const,
    title: "Production records",
    copy: "Egg counts and flock information scattered across notebooks, spreadsheets, and messages.",
  },
  {
    icon: Wheat,
    tint: "amber" as const,
    title: "Rising costs",
    copy: "Feed expenses accumulate, but understanding their impact on each egg can take time.",
  },
  {
    icon: Wallet,
    tint: "violet" as const,
    title: "Unclear profitability",
    copy: "Sales may look healthy while the full cost of running the farm remains difficult to calculate.",
  },
];

/** The chain the product exists to close, in the farmer's own order. */
const FLOW = [
  {
    icon: Egg,
    title: "Record production",
    copy: "Eggs collected, broken and dirty counts, and sizes.",
  },
  {
    icon: Wheat,
    title: "Track feed & expenses",
    copy: "Feed by the kilo or the sack, and every other cost.",
  },
  {
    icon: PhilippinePeso,
    title: "Manage sales",
    copy: "Customers on file or walk-ins, cash or on credit.",
  },
  {
    icon: TrendingUp,
    title: "Review performance",
    copy: "Revenue, costs, and estimated operating profit.",
  },
];

/** "Built for the realities of running a layer farm." Plan pills come from the real gate. */
const DIFFERENTIATORS: {
  icon: typeof Egg;
  tint: "green" | "amber" | "teal" | "rose" | "violet";
  title: string;
  copy: string;
  plan: Feature | null;
}[] = [
  {
    icon: Smartphone,
    tint: "green",
    title: "Mobile friendly",
    copy: "Large buttons and simple forms, made for a phone in the poultry house.",
    plan: null,
  },
  {
    icon: WifiOff,
    tint: "rose",
    title: "Offline recording",
    copy: "Record production, feed, and mortality offline. It syncs when you're back online.",
    plan: "offline_mode",
  },
  {
    icon: PhilippinePeso,
    tint: "amber",
    title: "Philippine pesos & trays",
    copy: "Familiar currency, egg trays, and local conventions by default.",
    plan: null,
  },
  {
    icon: Users,
    tint: "teal",
    title: "Multi-farm & team",
    copy: "Add farms and staff, each with access scoped to their role.",
    plan: "multi_farm",
  },
  {
    icon: ThermometerSun,
    tint: "amber",
    title: "Heat warnings",
    copy: "PAGASA heat-index warnings before hot days, for your farm's location.",
    plan: "weather",
  },
  {
    icon: Syringe,
    tint: "green",
    title: "Vaccination reminders",
    copy: "Your vet's programme, with due doses flagged for each flock.",
    plan: "vaccination_schedule",
  },
];

const HOME_FAQ = pickFaq([
  "What is LayerFlow?",
  "Who is LayerFlow for?",
  "Can I start for free?",
  "Does LayerFlow work offline?",
  "Can I manage multiple farms?",
  "Is my farm data secure?",
]);

// -- Showcase A: production entry, computed with the app's real formulas so the
// numbers on the page can never drift from what the product would actually show.
const SHOWCASE_HENS = 942;
const SHOWCASE_EGGS = 820;
const SHOWCASE_BROKEN = 12;
const SHOWCASE_DIRTY = 8;
const SHOWCASE_FEED_KG = 115;
const showcaseLayingRate = layingRate(SHOWCASE_EGGS, SHOWCASE_HENS);
const showcaseSellable = sellableEggs(SHOWCASE_EGGS, SHOWCASE_BROKEN, SHOWCASE_DIRTY);
const showcaseTrays = eggsToTrays(showcaseSellable);

// -- Showcase B: profitability.
const SHOWCASE_REVENUE = 176_500;
const SHOWCASE_COSTS = 119_300;
const showcaseProfit = operatingProfit(SHOWCASE_REVENUE, SHOWCASE_COSTS);
const showcaseCostPerEgg = costPerEgg(SHOWCASE_COSTS, 19_560);

/**
 * A hand-built trend, not real chart data -- same technique as
 * dashboard-mockup.tsx's CHART_POINTS -- just enough to read as "revenue,
 * cost and profit moving together over a few weeks". Colour order matches
 * the real in-app chart (components/charts/profit-chart.tsx): chart-1 is
 * always revenue, chart-2 always cost, extended here with chart-3 for
 * profit since this one also shows the gap between them.
 */
const CHART_SERIES = [
  { revenue: 30, cost: 22, profit: 8 },
  { revenue: 34, cost: 24, profit: 10 },
  { revenue: 32, cost: 25, profit: 7 },
  { revenue: 38, cost: 26, profit: 12 },
  { revenue: 36, cost: 23, profit: 13 },
  { revenue: 40, cost: 27, profit: 13 },
  { revenue: 42, cost: 26, profit: 16 },
  { revenue: 39, cost: 25, profit: 14 },
];

export default function LandingPage() {
  return (
    <MarketingPage jsonLd={[websiteSchema(), softwareApplicationSchema(), faqSchema(HOME_FAQ)]}>
      {/* ================================================================ */}
      {/* Hero */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden bg-section">
        <div
          className="pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:pb-24 lg:pt-16">
          <div>
            <Eyebrow>Poultry farm management, made for the Philippines</Eyebrow>

            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              Know your flock.
              <br />
              Know what your <span className="text-primary-strong">farm earns.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Track egg production, feed costs, sales, expenses, and estimated operating profit in
              one simple dashboard. Spend less time piecing together records and more time making
              informed farm decisions.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                Start free
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/features" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Explore the dashboard
              </Link>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {TRUST.map((item) => (
                <li key={item.title} className="flex items-start gap-2.5">
                  <item.icon className="mt-0.5 size-5 shrink-0 text-primary-strong" aria-hidden />
                  <span className="text-sm leading-tight">
                    <span className="block font-semibold text-foreground">{item.title}</span>
                    <span className="text-muted-foreground">{item.copy}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Reveal className="relative">
            <div className="lg:translate-x-4">
              <DashboardMockup />
            </div>

            {/* Phone preview, overlapping the dashboard's corner -- same showcase
                numbers used in the workflow section below, so the two never
                disagree. Hidden below sm: a phone frame has no room to sit
                beside the dashboard once the hero itself stacks to one column. */}
            <div className="absolute -bottom-10 -left-4 hidden w-32 sm:block lg:-left-8 lg:w-36">
              <MobileMockup className="border-4 shadow-pop">
                <p className="text-[10px] font-semibold">Today</p>
                <div className="mt-2 flex flex-col gap-1.5 text-[9px]">
                  <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                    <span className="text-muted-foreground">Eggs</span>
                    <span className="tabular font-medium">{formatNumber(SHOWCASE_EGGS)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                    <span className="text-muted-foreground">Laying</span>
                    <span className="tabular font-medium">{formatPercent(showcaseLayingRate)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                    <span className="text-muted-foreground">Trays</span>
                    <span className="tabular font-medium">{showcaseTrays.trays}</span>
                  </div>
                </div>
              </MobileMockup>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* Problem */}
      {/* ================================================================ */}
      <Section>
        <Reveal>
          <SectionHeading
            title={
              <>
                Your farm generates the numbers.
                <br className="hidden sm:block" /> Are you seeing the whole picture?
              </>
            }
            lead="Egg counts, expenses, and sales are important — but when they're scattered, it's hard to know if your farm is truly profitable."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PROBLEMS.map((problem) => (
              <FeatureCard key={problem.title} {...problem} />
            ))}
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-primary-strong">
            <ArrowRight className="size-4 rotate-90 sm:rotate-0" aria-hidden />
            LayerFlow brings these numbers together in one place.
          </p>
        </Reveal>
      </Section>

      {/* ================================================================ */}
      {/* Workflow */}
      {/* ================================================================ */}
      <Section tone="tint" id="how-it-works">
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <SectionHeading
                title="From morning egg collection to better farm decisions."
                lead="A simple 4-step workflow keeps your farm records organized and your numbers clear."
              />

              <ol className="mt-10 grid gap-6 sm:grid-cols-2">
                {FLOW.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <IconChip icon={step.icon} tint="green" />
                      <span className="text-xs font-semibold tabular text-primary-strong">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-8 text-sm">
                <Link href="/how-it-works" className="font-medium text-primary-strong hover:underline">
                  See the full walkthrough →
                </Link>
              </p>
            </div>

            <MobileMockup>
              <p className="text-xs font-semibold">Record production</p>
              <p className="text-[11px] text-muted-foreground">Flock #001</p>

              <div className="mt-3 flex flex-col gap-2 text-xs">
                <Row label="Hens present" value={formatNumber(SHOWCASE_HENS)} />
                <Row label="Eggs collected" value={formatNumber(SHOWCASE_EGGS)} />
                <Row label="Broken eggs" value={formatNumber(SHOWCASE_BROKEN)} />
                <Row label="Dirty eggs" value={formatNumber(SHOWCASE_DIRTY)} />
                <Row label="Feed used" value={`${formatNumber(SHOWCASE_FEED_KG)} kg`} />
              </div>

              <div className="mt-3 rounded-lg bg-muted p-2.5 text-[11px]">
                <p className="tabular">
                  <span className="font-semibold">{formatPercent(showcaseLayingRate)}</span> laying rate
                </p>
                <p className="mt-0.5 tabular text-muted-foreground">
                  {showcaseTrays.trays} trays + {showcaseTrays.looseEggs} eggs
                </p>
              </div>

              <div className="mt-3 rounded-md bg-primary py-2 text-center text-[11px] font-medium text-primary-foreground">
                Save today&apos;s record
              </div>
            </MobileMockup>
          </div>
        </Reveal>
      </Section>

      {/* ================================================================ */}
      {/* Financial overview */}
      {/* ================================================================ */}
      <Section>
        <Reveal>
          <SectionHeading
            title="See how your numbers add up."
            lead="Track the relationship between egg production, feed consumption, sales, and expenses to build a clearer picture of your farm's performance."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-stretch">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold">Financial overview</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Revenue" value={formatCurrency(SHOWCASE_REVENUE)} />
                <Stat label="Operating costs" value={formatCurrency(SHOWCASE_COSTS)} />
                <Stat label="Est. operating profit" value={formatCurrency(showcaseProfit)} accent />
                <Stat label="Cost / egg" value={formatCurrency(showcaseCostPerEgg)} />
              </div>

              <p className="mt-6 text-xs font-medium text-muted-foreground">Profitability trend</p>
              <svg viewBox="0 0 200 60" className="mt-2 h-28 w-full" aria-hidden>
                {CHART_SERIES.map((point, index) => {
                  const groupWidth = 200 / CHART_SERIES.length;
                  const x = index * groupWidth + 3;
                  const barWidth = 5.5;
                  return (
                    <g key={index}>
                      <rect x={x} y={60 - point.revenue} width={barWidth} height={point.revenue} rx="1.5" className="fill-[hsl(var(--chart-1))]" />
                      <rect x={x + barWidth + 1} y={60 - point.cost} width={barWidth} height={point.cost} rx="1.5" className="fill-[hsl(var(--chart-2))]" />
                      <rect x={x + (barWidth + 1) * 2} y={60 - point.profit} width={barWidth} height={point.profit} rx="1.5" className="fill-[hsl(var(--chart-3))]" />
                    </g>
                  );
                })}
              </svg>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <Legend swatch="bg-[hsl(var(--chart-1))]" label="Revenue" />
                <Legend swatch="bg-[hsl(var(--chart-2))]" label="Cost" />
                <Legend swatch="bg-[hsl(var(--chart-3))]" label="Profit" />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-border bg-section p-6 text-sm">
              <p className="font-semibold text-foreground">
                What&apos;s included in estimated operating profit?
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-muted-foreground">
                {["Egg sales revenue", "Feed costs", "Other operating expenses"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary-strong" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Not included
              </p>
              <ul className="mt-2 flex flex-col gap-2 text-muted-foreground">
                {["Depreciation", "Owner's draw / personal expenses", "Financing costs"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Minus className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-auto pt-6">
                <Link href="/blog/reading-your-farms-operating-profit" className="font-medium text-primary-strong hover:underline">
                  Learn more about our metrics →
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ================================================================ */}
      {/* Differentiators */}
      {/* ================================================================ */}
      <Section tone="tint">
        <Reveal>
          <SectionHeading
            title="Built for the realities of running a layer farm."
            lead="The details that matter outside the office."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </Reveal>
      </Section>

      <UsageStats />

      <TestimonialSection />

      {/* ================================================================ */}
      {/* Pricing */}
      {/* ================================================================ */}
      <Section aria-label="Pricing">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Pricing"
            title="Simple, transparent pricing"
            lead="Choose the plan that fits your farm. Start free, no credit card required."
          />
          <div className="mt-10">
            <LandingPlanCards />
          </div>
        </Reveal>
      </Section>

      {/* ================================================================ */}
      {/* FAQ */}
      {/* ================================================================ */}
      <Section tone="tint" id="faq">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <SectionHeading title="Common questions" lead="The short answers to what farmers ask us most." />
            <p className="mt-6 text-sm">
              <Link href="/faq" className="font-medium text-primary-strong hover:underline">
                See the full FAQ →
              </Link>
            </p>
          </div>
          <FaqAccordion items={HOME_FAQ} />
        </div>
      </Section>

      <CtaBand
        title="Your farm already produces the data. Put it to work."
        lead="Bring production, feed, sales, and expenses together in one place."
        secondary={{ href: "/how-it-works", label: "See how it works" }}
      />
    </MarketingPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className={cn("text-lg font-bold tabular", accent && "text-primary")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", swatch)} aria-hidden />
      {label}
    </span>
  );
}
