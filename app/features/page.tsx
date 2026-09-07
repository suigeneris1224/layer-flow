import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Download,
  FolderTree,
  GitCompare,
  HeartPulse,
  LifeBuoy,
  PhilippinePeso,
  Tags,
  TriangleAlert,
  Users,
  Warehouse,
  Wheat,
  WifiOff,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything LayerFlow does, from the morning egg count to comparing farms.",
};

const GROUPS = [
  {
    title: "Daily recording",
    subtitle: "The routine that feeds everything else.",
    features: [
      {
        icon: ClipboardList,
        tint: "green" as const,
        title: "Production",
        copy: "Log eggs collected, broken and dirty counts, and a breakdown by size, in under a minute.",
      },
      {
        icon: Wheat,
        tint: "amber" as const,
        title: "Feed, by the kilo or the sack",
        copy: "Enter feed cost per kilo directly, or tell it your sack size and price and let it do the math.",
      },
      {
        icon: HeartPulse,
        tint: "rose" as const,
        title: "Flock health",
        copy: "Track every flock from placement to production, with mortality and vaccination records.",
      },
    ],
  },
  {
    title: "Stock and pricing",
    subtitle: "What's on hand, and what it's worth.",
    features: [
      {
        icon: Boxes,
        tint: "teal" as const,
        title: "Egg inventory",
        copy: "See what's in stock by size, so you know what you can sell before you promise it.",
      },
      {
        icon: Tags,
        tint: "violet" as const,
        title: "Egg pricing",
        copy: "Set a price per size and change it whenever the market does, with a history you can look back on.",
      },
    ],
  },
  {
    title: "Money in, money out",
    subtitle: "Sales, customers, and the real cost of running the farm.",
    features: [
      {
        icon: PhilippinePeso,
        tint: "teal" as const,
        title: "Sales & customers",
        copy: "Record sales by tray or by egg, to a customer on file or a walk-in, paid in full or on credit.",
      },
      {
        icon: FolderTree,
        tint: "amber" as const,
        title: "Expenses",
        copy: "Track every peso spent, categorized, so you can see where it's actually going.",
      },
      {
        icon: BarChart3,
        tint: "green" as const,
        title: "Profitability",
        copy: "Revenue minus feed and expenses, as estimated operating profit you can trust.",
      },
    ],
  },
  {
    title: "See what's happening",
    subtitle: "Turn daily numbers into trends worth acting on.",
    features: [
      {
        icon: BarChart3,
        tint: "violet" as const,
        title: "Reports & analytics",
        copy: "Laying rate, feed cost per hen, and egg-size mix, charted over any period you choose.",
      },
      {
        icon: TriangleAlert,
        tint: "rose" as const,
        title: "Alerts",
        copy: "A production drop, a low-stock size, or a stale price gets flagged before it costs you.",
      },
    ],
  },
  {
    title: "Run more than one farm",
    subtitle: "For operations with staff, or more than one flock to manage.",
    features: [
      {
        icon: Warehouse,
        tint: "teal" as const,
        title: "Multiple farms",
        copy: "Keep every farm you run under one account, each with its own records.",
      },
      {
        icon: Users,
        tint: "amber" as const,
        title: "Team accounts",
        copy: "Bring on farmhands, managers, and clerks, each with their own login and role.",
      },
      {
        icon: GitCompare,
        tint: "green" as const,
        title: "Compare farms",
        copy: "See revenue, cost, and profit side by side across every farm you run.",
      },
    ],
  },
  {
    title: "Built for the field",
    subtitle: "The details that matter outside the office.",
    features: [
      {
        icon: WifiOff,
        tint: "rose" as const,
        title: "Works offline",
        copy: "Keep recording with no signal. LayerFlow syncs automatically once you're back in range.",
      },
      {
        icon: Download,
        tint: "violet" as const,
        title: "CSV export",
        copy: "Pull your sales and expense records out as a spreadsheet whenever you need them.",
      },
      {
        icon: LifeBuoy,
        tint: "teal" as const,
        title: "Support",
        copy: "Reach us right from the app when something's not working, with faster handling on Pro.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 py-14 text-center">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Everything your farm needs, in one place
          </h1>
          <p className="mt-2 text-muted-foreground">
            Built for the whole operation, not just the spreadsheet it replaces.
          </p>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-6")}
          >
            Start free
          </Link>
        </section>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 pb-16">
          {GROUPS.map((group) => (
            <Reveal key={group.title}>
              <section aria-label={group.title}>
                <h2 className="text-xl font-semibold">{group.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{group.subtitle}</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.features.map((feature) => (
                    <FeatureCard key={feature.title} {...feature} />
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 text-center">
            <h2 className="text-xl font-semibold">Not sure which plan you need?</h2>
            <p className="mt-1 text-muted-foreground">
              Every plan starts free. See which one includes what.
            </p>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5")}
            >
              See plans &amp; pricing
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
