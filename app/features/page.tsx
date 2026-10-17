import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  Egg,
  FileSpreadsheet,
  GitCompareArrows,
  Headphones,
  FlaskConical,
  PhilippinePeso,
  Ruler,
  ShieldCheck,
  Syringe,
  ThermometerSun,
  Users,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { PageHero } from "@/components/marketing/page-hero";
import { PhotoSlot } from "@/components/marketing/photo-slot";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PlanBadge } from "@/components/marketing/plan-badge";
import { MockupThumb } from "@/components/marketing/mockup-thumb";
import { CtaBand } from "@/components/marketing/cta-band";
import { FeatureCard } from "@/components/marketing/feature-card";
import { Reveal } from "@/components/marketing/reveal";
import { ProductionMockup } from "@/components/marketing/production-mockup";
import { InventoryMockup } from "@/components/marketing/inventory-mockup";
import { MoneyMockup } from "@/components/marketing/money-mockup";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";
import { NotificationsMockup } from "@/components/marketing/notifications-mockup";
import { TeamMockup } from "@/components/marketing/team-mockup";
import { MobileMockup } from "@/components/marketing/mobile-mockup";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/marketing/structured-data";
import type { Feature } from "@/lib/subscriptions/plans";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "Every LayerFlow feature for layer farms: egg production and flock records, egg inventory, sales and customers, expenses, reports, alerts, vaccination schedules, biosecurity logs, feed formulation, heat warnings, team access, and offline recording.";

export const metadata: Metadata = {
  title: "Features — Egg Production, Feed, Sales & Profit Tracking",
  description: DESCRIPTION,
  openGraph: { title: "LayerFlow Features", description: DESCRIPTION, url: "/features" },
};

/**
 * Plan pills come from the real gate via PlanBadge, not guessed: production
 * and inventory are ungated (`null`), the rest name the Feature that unlocks
 * them in lib/subscriptions/plans.ts.
 */
const CORE: {
  icon: LucideIcon;
  tint: ChipTint;
  title: string;
  copy: string;
  plan: Feature | null;
  docs: string;
  mockup: React.ReactNode;
}[] = [
  {
    icon: Egg,
    tint: "green",
    title: "Egg production and flock management",
    copy: "Record eggs collected, broken and dirty counts, egg sizes, mortality, and vaccinations — laying rate is calculated for you.",
    plan: null,
    docs: "/docs#daily-recording",
    mockup: <ProductionMockup />,
  },
  {
    icon: Boxes,
    tint: "amber",
    title: "Inventory and egg stock",
    copy: "Know what's available to sell by size, set tray prices, and avoid selling stock you don't have.",
    plan: null,
    docs: "/docs#inventory-pricing",
    mockup: <InventoryMockup />,
  },
  {
    icon: PhilippinePeso,
    tint: "teal",
    title: "Sales, customers, and expenses",
    copy: "Record sales by tray or by egg, track customer balances and credit, and log feed and every other farm expense.",
    plan: "egg_sales",
    docs: "/docs#sales",
    mockup: <MoneyMockup />,
  },
  {
    icon: BarChart3,
    tint: "violet",
    title: "Reports and farm performance",
    copy: "See production trends, cost per egg, revenue, and estimated operating profit over any period.",
    plan: "reports",
    docs: "/docs#reports",
    mockup: <DashboardMockup />,
  },
  {
    icon: Bell,
    tint: "rose",
    title: "Alerts and notifications",
    copy: "Get flagged when production drops, mortality runs high, a vaccination is due, a footbath change is overdue, or a hot day is coming — plus low-stock and loss alerts on Pro.",
    plan: "alerts",
    docs: "/docs#notifications",
    mockup: <NotificationsMockup />,
  },
  {
    icon: Users,
    tint: "teal",
    title: "Team and multi-farm management",
    copy: "Invite managers and workers with role-based access, and run several farms from one account.",
    plan: "multi_farm",
    docs: "/docs#team",
    mockup: <TeamMockup />,
  },
  {
    icon: WifiOff,
    tint: "green",
    title: "Offline recording and sync",
    copy: "Record production, feed, and mortality with no signal. Entries sync automatically when you're back online.",
    plan: "offline_mode",
    docs: "/docs#offline",
    mockup: (
      <div className="flex justify-center pt-2">
        <MobileMockup className="max-w-[240px]">
          <p className="rounded-md bg-chip-amber px-2 py-1 text-[11px] font-medium text-chip-amber-fg">
            Offline — 2 entries waiting to sync
          </p>
          <p className="mt-3 text-xs font-semibold">Record production</p>
          <div className="mt-2 rounded-md border border-border px-2.5 py-1.5 text-xs">Eggs collected · 820</div>
        </MobileMockup>
      </div>
    ),
  },
];

/**
 * Farm health and planning tools. Copy stays factual on purpose: the farm
 * enters its own vet's programme and its own feed values, and the weather is
 * PAGASA's heat index -- LayerFlow never recommends a vaccine, a recipe, or
 * what to do on a hot day (same stance as lib/domain/alerts.ts).
 */
const HEALTH: {
  icon: LucideIcon;
  tint: ChipTint;
  title: string;
  copy: string;
  plan: Feature;
  href: string;
}[] = [
  {
    icon: Syringe,
    tint: "green",
    title: "Vaccination schedule",
    copy: "Enter your vet's programme once. See which doses each flock has due, with a reminder before each one.",
    plan: "vaccination_schedule",
    href: "/docs#vaccination-schedule",
  },
  {
    icon: ShieldCheck,
    tint: "teal",
    title: "Biosecurity log",
    copy: "Log farm visitors and routine checks like footbath changes and pest control, with a reminder when one is overdue.",
    plan: "biosecurity",
    href: "/docs#biosecurity",
  },
  {
    icon: FlaskConical,
    tint: "violet",
    title: "Feed formulation",
    copy: "Mix your own feed from your ingredients' prices and label values. See protein, energy and cost per kg, and use the mix on your feed records.",
    plan: "feed_formulation",
    href: "/docs#feed-formulas",
  },
  {
    icon: ThermometerSun,
    tint: "amber",
    title: "Heat & weather",
    copy: "A 4-day forecast for your farm with PAGASA heat-index warnings before hot days, and temperature next to your laying rate.",
    plan: "weather",
    href: "/docs#weather",
  },
];

const MORE: { icon: LucideIcon; tint: ChipTint; title: string; copy: string; plan: Feature }[] = [
  {
    icon: Ruler,
    tint: "amber",
    title: "Egg size analytics",
    copy: "Your daily size mix, and how it shifts as the flock ages.",
    plan: "egg_size_analytics",
  },
  {
    icon: GitCompareArrows,
    tint: "violet",
    title: "Flock comparison",
    copy: "Laying rate, feed efficiency, and cost per egg, side by side.",
    plan: "flock_comparison",
  },
  {
    icon: FileSpreadsheet,
    tint: "teal",
    title: "CSV export",
    copy: "Take your sales and expense records out as a spreadsheet.",
    plan: "data_export",
  },
  {
    icon: Headphones,
    tint: "rose",
    title: "Priority support",
    copy: "Your questions go to the front of the queue when you need help.",
    plan: "priority_support",
  },
];

export default function FeaturesPage() {
  return (
    <MarketingPage
      jsonLd={[
        softwareApplicationSchema(),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
        ]),
      ]}
    >
      <PageHero
        eyebrow="Features"
        title={
          <>
            Everything your layer farm needs. <span className="text-primary-strong">Nothing you don&apos;t.</span>
          </>
        }
        lead="Manage daily production, track feed and expenses, record sales, and understand your farm's performance without juggling separate records."
        actions={
          <>
            <Link href="/signup" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
              Start free
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/pricing" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Compare plans
            </Link>
          </>
        }
        media={<PhotoSlot photo="featuresHero" priority className="shadow-pop" />}
      />

      <Section>
        <SectionHeading eyebrow="Core features" title="One place for every number your farm produces." />

        <ul className="mt-10 flex flex-col gap-4">
          {CORE.map((feature) => (
            <li key={feature.title}>
              <Reveal>
                <div className="grid items-center gap-5 rounded-2xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-pop sm:p-6 md:grid-cols-[1fr_17rem] lg:grid-cols-[1fr_20rem]">
                  <div className="flex gap-4">
                    <IconChip icon={feature.icon} tint={feature.tint} size="lg" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                        <PlanBadge feature={feature.plan} />
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{feature.copy}</p>
                      <Link
                        href={feature.docs as Route}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-strong hover:underline"
                      >
                        Learn more
                        <span className="sr-only"> about {feature.title.toLowerCase()}</span>
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                  <MockupThumb className="hidden sm:block">{feature.mockup}</MockupThumb>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="tint">
        <SectionHeading
          eyebrow="Health & planning"
          title="Stay ahead of vaccinations, visitors, feed and heat."
          lead="Your vet's programme, your feed supplier's values, PAGASA's heat index. LayerFlow keeps the dates and does the math."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HEALTH.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading
          title="And for growing farms"
          lead="Deeper analysis and team tools on the Pro plan."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MORE.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </Section>

      <CtaBand
        tone="soft"
        title="Ready to explore all features?"
        lead="See the complete feature list and what each plan includes."
        primary={{ href: "/pricing", label: "View pricing" }}
        secondary={{ href: "/how-it-works", label: "See how it works" }}
      />
    </MarketingPage>
  );
}
