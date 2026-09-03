import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Egg,
  HeartPulse,
  RefreshCw,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  Wheat,
  WifiOff,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { PublicFooter } from "@/components/marketing/public-footer";
import { StickyNavBlur } from "@/components/marketing/sticky-nav-blur";
import { PublicHeader } from "@/components/marketing/public-header";
import { FeatureCard } from "@/components/marketing/feature-card";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";
import { MobileMockup } from "@/components/marketing/mobile-mockup";
import { Reveal } from "@/components/marketing/reveal";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { layingRate, operatingProfit, sellableEggs, eggsToTrays, costPerEgg } from "@/lib/domain/calculations";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { PLANS, PLAN_ORDER, FEATURE_LABELS, formatPlanPrice, type Feature } from "@/lib/subscriptions/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "LayerFlow — Poultry Layer Farm Management Software",
  description:
    "LayerFlow helps layer farmers track egg production, feed, expenses, sales, and profitability in one simple farm management platform.",
  openGraph: {
    title: "LayerFlow — Poultry Layer Farm Management Software",
    description:
      "LayerFlow helps layer farmers track egg production, feed, expenses, sales, and profitability in one simple farm management platform.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LayerFlow — Poultry Layer Farm Management Software",
    description:
      "LayerFlow helps layer farmers track egg production, feed, expenses, sales, and profitability in one simple farm management platform.",
  },
};

/** The chain the product exists to close, in the farmer's own order. */
const FLOW = [
  { icon: Egg, title: "Your eggs", copy: "Log the morning collection in under a minute." },
  { icon: Wheat, title: "Your cost", copy: "Feed and expenses, counted as you go." },
  { icon: Wallet, title: "Your profit", copy: "What the flock actually earned today." },
  { icon: TrendingUp, title: "Your decision", copy: "See a drop early, while you can still act." },
];

/** Real, shipped capabilities -- traceable to lib/subscriptions/plans.ts and the app itself. */
const FEATURES = [
  {
    icon: ClipboardList,
    tint: "green" as const,
    title: "Production",
    copy: "Record daily egg production in seconds, with a breakdown by size.",
  },
  {
    icon: Wheat,
    tint: "amber" as const,
    title: "Feed",
    copy: "Track feed usage and cost per hen as you go.",
  },
  {
    icon: HeartPulse,
    tint: "rose" as const,
    title: "Flocks",
    copy: "Monitor every flock from placement to production, including mortality and vaccinations.",
  },
  {
    icon: Users,
    tint: "teal" as const,
    title: "Sales",
    copy: "Track egg sales, customers, and part-payments.",
  },
  {
    icon: Wallet,
    tint: "violet" as const,
    title: "Profitability",
    copy: "Understand revenue, costs, and estimated operating profit.",
  },
  {
    icon: BarChart3,
    tint: "green" as const,
    title: "Reports",
    copy: "See trends across production, cost, and sales to make better decisions.",
  },
];

const PROBLEMS = [
  "Production records scattered across notebooks and group chats.",
  "No easy way to see what feed is actually costing per hen.",
  "Sales and expenses tracked separately, if at all.",
  "No clear view of whether the farm is actually profitable.",
  "Hard to compare how one flock is doing against another.",
];

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

// -- Showcase C: flocks (numbers chosen so the displayed laying rate matches what
// layingRate() actually computes, not just typed-in percentages).
const FLOCKS = [
  { name: "Flock #001", breed: "ISA Brown", hens: 942, eggs: 820 },
  { name: "Flock #002", breed: "Lohmann Brown", hens: 816, eggs: 685 },
];

const ALERTS = [
  {
    level: "good" as const,
    icon: CheckCircle2,
    message: "Production is normal.",
  },
  {
    level: "warn" as const,
    icon: TriangleAlert,
    message: "Feed cost is 8% higher than your recent average.",
  },
  {
    level: "bad" as const,
    icon: AlertCircle,
    message: "Egg production is down 11% compared with your recent average.",
  },
];

const ALERT_TONE = {
  good: { wash: "bg-[hsl(var(--status-good))]/10", text: "text-[hsl(var(--status-good))]" },
  warn: { wash: "bg-[hsl(var(--status-warn))]/10", text: "text-[hsl(var(--status-warn))]" },
  bad: { wash: "bg-[hsl(var(--status-bad))]/10", text: "text-[hsl(var(--status-bad))]" },
};

const PLAN_FEATURE_ROWS: Record<string, Feature[]> = {
  FREE: ["production_charts"],
  STARTER: ["egg_sales", "full_expenses", "profitability", "alerts", "reports"],
  PRO: ["team_management", "multi_farm", "advanced_reports", "data_export"],
};

const FAQ_ITEMS = [
  {
    question: "What is LayerFlow?",
    answer:
      "LayerFlow is farm operations software for layer farms: it tracks production, feed, sales, expenses, and profitability in one dashboard, instead of scattered notebooks and spreadsheets.",
  },
  {
    question: "Who is LayerFlow for?",
    answer:
      "Layer farms in the Philippines with roughly 100 to 5,000 hens — from a single-flock backyard operation to a multi-house commercial farm with staff.",
  },
  {
    question: "Can I start for free?",
    answer:
      "Yes. The Free plan covers one farm, one house, and one flock with 30 days of history — no card required.",
  },
  {
    question: "Can I use LayerFlow on my phone?",
    answer:
      "Yes, LayerFlow is built mobile-first: large touch targets, 16px inputs that don't trigger an iOS zoom, and a layout designed for a phone in a poultry house.",
  },
  {
    question: "Does LayerFlow work offline?",
    answer:
      "Offline support is new: the app is designed to keep working through a weak signal and sync your records once you're back online, starting with the Starter plan.",
  },
  {
    question: "Can multiple people use one farm?",
    answer:
      "Yes, from the Pro plan. Invite teammates by role — worker, manager, or owner — so everyone sees the same numbers.",
  },
  {
    question: "Can I manage multiple farms?",
    answer:
      "Yes, on the Pro plan, with reporting that rolls up across every farm you run.",
  },
  {
    question: "Is my farm data secure?",
    answer:
      "Your farm's data is isolated at the database level — no other farm can read it, including in shared infrastructure. See our Privacy page for details.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <StickyNavBlur>
        <PublicHeader />
      </StickyNavBlur>

      <main id="main" className="flex-1">
        {/* ================================================================ */}
        {/* Hero */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-background" aria-hidden />

          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                Poultry farm management, simplified
              </p>

              <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight lg:text-5xl">
                Know your flock.
                <br />
                Know your numbers.
              </h1>

              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Track egg production, feed, mortality, sales, expenses, and profitability &mdash;
                all in one simple dashboard. Built for 100 to 5,000 hens, and for a phone in a
                poultry house.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }), "sm:w-auto")}
                >
                  Start free
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="#how-it-works"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "sm:w-auto")}
                >
                  See how it works
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border bg-muted px-2.5 py-1">
                  100–5,000 hens
                </span>
                <span className="rounded-md border border-border bg-muted px-2.5 py-1">
                  Priced in ₱
                </span>
                <span className="rounded-md border border-border bg-muted px-2.5 py-1">
                  Asia/Manila
                </span>
                <span className="rounded-md border border-border bg-muted px-2.5 py-1">
                  Free for one flock, no card
                </span>
              </div>
            </div>

            <Reveal>
              <DashboardMockup />
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Trust strip */}
        {/* ================================================================ */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-4 px-4 py-8 text-center">
            <div>
              <p className="text-2xl font-bold tabular">100%</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Cloud-based</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular">24/7</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Farm access</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular">1</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Simple dashboard</p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* How it works */}
        {/* ================================================================ */}
        <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-14">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <p className="mt-1 text-muted-foreground">Four numbers, in the order they matter.</p>

            <div className="relative mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="absolute inset-x-0 top-5 hidden h-px bg-border lg:block" aria-hidden />

              {FLOW.map((step, index) => (
                <div key={step.title} className="relative flex flex-col gap-3">
                  <span className="relative z-10 inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      <step.icon className="size-4 text-primary" aria-hidden />
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ================================================================ */}
        {/* Problem */}
        {/* ================================================================ */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <svg viewBox="0 0 240 200" className="mx-auto w-full max-w-xs text-primary" aria-hidden>
                <rect x="20" y="30" width="90" height="60" rx="8" className="fill-surface stroke-border" strokeWidth="2" transform="rotate(-6 65 60)" />
                <rect x="60" y="70" width="90" height="60" rx="8" className="fill-surface stroke-border" strokeWidth="2" transform="rotate(4 105 100)" />
                <rect x="110" y="40" width="90" height="60" rx="8" className="fill-surface stroke-primary" strokeWidth="2" transform="rotate(-2 155 70)" />
                <line x1="130" y1="60" x2="180" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="130" y1="72" x2="170" y2="72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="130" y1="84" x2="175" y2="84" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </Reveal>

            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
                Running a layer farm shouldn&apos;t mean running a spreadsheet.
              </h2>
              <ul className="mt-6 flex flex-col gap-3">
                {PROBLEMS.map((problem) => (
                  <li key={problem} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {problem}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Solution / feature grid */}
        {/* ================================================================ */}
        <section id="features" aria-label="Capabilities" className="mx-auto w-full max-w-6xl px-4 py-14">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">Everything your layer farm needs.</h2>
            <p className="mt-1 text-muted-foreground">
              Built for the whole operation, not just the spreadsheet it replaces.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </Reveal>
        </section>

        {/* ================================================================ */}
        {/* Showcase A: production entry */}
        {/* ================================================================ */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                Daily production
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
                Record today&apos;s production in seconds.
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Hens present, eggs collected, broken and dirty &mdash; a handful of numbers, and
                LayerFlow works out the rest: laying rate, sellable eggs, and trays.
              </p>
            </Reveal>

            <Reveal>
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
                    <span className="font-semibold">{formatPercent(showcaseLayingRate)}</span>{" "}
                    laying rate
                  </p>
                  <p className="mt-0.5 tabular text-muted-foreground">
                    {showcaseTrays.trays} trays + {showcaseTrays.looseEggs} eggs
                  </p>
                </div>

                <div className="mt-3 rounded-md bg-primary py-2 text-center text-[11px] font-medium text-primary-foreground">
                  Save today&apos;s record
                </div>
              </MobileMockup>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Showcase B: profitability */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <Reveal className="lg:order-2">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                Profitability
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
                Know where your money is going.
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                LayerFlow connects production, feed, expenses, and sales so you can see the real
                operational picture of your farm &mdash; not just revenue.
              </p>
            </Reveal>

            <Reveal className="lg:order-1">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Revenue" value={formatCurrency(SHOWCASE_REVENUE)} />
                  <Stat label="Operating costs" value={formatCurrency(SHOWCASE_COSTS)} />
                  <Stat label="Est. operating profit" value={formatCurrency(showcaseProfit)} accent />
                  <Stat label="Cost / egg" value={formatCurrency(showcaseCostPerEgg)} />
                </div>
                <svg viewBox="0 0 200 50" className="mt-4 h-14 w-full text-primary" aria-hidden>
                  <polyline
                    points="0,40 25,36 50,38 75,26 100,30 125,16 150,20 175,8 200,12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Showcase C: flocks */}
        {/* ================================================================ */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Flocks</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
                See every flock at a glance.
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Age, current hens, production, feed and mortality &mdash; per flock, so you can
                compare one house against another instead of guessing.
              </p>
            </Reveal>

            <Reveal className="flex flex-col gap-3">
              {FLOCKS.map((flock) => {
                const rate = layingRate(flock.eggs, flock.hens);
                return (
                  <div
                    key={flock.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
                  >
                    <div>
                      <p className="font-semibold">{flock.name}</p>
                      <p className="text-xs text-muted-foreground">{flock.breed}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular font-semibold">{formatNumber(flock.hens)} hens</p>
                      <p className="tabular text-xs text-muted-foreground">
                        {formatPercent(rate)} laying rate
                      </p>
                    </div>
                  </div>
                );
              })}
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Offline */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                Built for weak signal
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
                No signal? Keep working.
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                LayerFlow keeps critical farm records available even when your connection isn&apos;t
                &mdash; record locally in the poultry house, and it syncs the moment you&apos;re back
                online.
              </p>
            </Reveal>

            <Reveal>
              <MobileMockup>
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5">
                    <WifiOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-medium">Offline mode</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--status-good))]/10 p-2.5">
                    <Check className="size-4 shrink-0 text-[hsl(var(--status-good))]" aria-hidden />
                    <span className="text-[hsl(var(--status-good))]">Record saved locally</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5">
                    <RefreshCw className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>Syncing…</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--status-good))]/10 p-2.5">
                    <Cloud className="size-4 shrink-0 text-[hsl(var(--status-good))]" aria-hidden />
                    <span className="text-[hsl(var(--status-good))]">Records synchronized</span>
                  </div>
                </div>
              </MobileMockup>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Alerts & insights */}
        {/* ================================================================ */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <Reveal>
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Know when something changes.</h2>
                <p className="mx-auto mt-1 max-w-lg text-muted-foreground">
                  Simple operational alerts help you notice changes before they become bigger
                  problems &mdash; no AI, no diagnosis, just what the numbers did.
                </p>
              </div>

              <div className="mx-auto mt-8 flex max-w-md flex-col gap-2">
                {ALERTS.map((alert) => {
                  const tone = ALERT_TONE[alert.level];
                  return (
                    <div
                      key={alert.message}
                      className={cn("flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm", tone.wash)}
                    >
                      <alert.icon className={cn("size-4 shrink-0", tone.text)} aria-hidden />
                      <span className={tone.text}>{alert.message}</span>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Pricing */}
        {/* ================================================================ */}
        <section aria-label="Pricing" className="mx-auto w-full max-w-6xl px-4 py-14">
          <Reveal>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight">Start simple. Grow with your farm.</h2>
              <p className="mt-1 text-muted-foreground">Start free. Move up when your farm does.</p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
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

                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

                    <p className="mt-3">
                      <span className="text-2xl font-bold tabular">{formatPlanPrice(plan)}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
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

            <p className="mt-6 text-center text-sm">
              <Link href="/pricing" className="font-medium text-primary hover:underline">
                See full plan comparison
              </Link>
            </p>
          </Reveal>
        </section>

        {/* ================================================================ */}
        {/* FAQ */}
        {/* ================================================================ */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto w-full max-w-3xl px-4 py-14">
            <Reveal>
              <h2 className="text-center text-2xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
              <div className="mt-8">
                <FaqAccordion items={FAQ_ITEMS} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Final CTA */}
        {/* ================================================================ */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <Reveal>
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-primary/5 px-6 py-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
                Run your farm with better numbers.
              </h2>
              <p className="max-w-md text-muted-foreground">
                Start tracking production, costs, sales, and profitability in one simple place.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                  Start free
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="#how-it-works"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Explore the dashboard
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <PublicFooter />
    </div>
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
