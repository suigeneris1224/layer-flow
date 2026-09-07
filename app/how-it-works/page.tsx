import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Egg,
  PhilippinePeso,
  TrendingUp,
  Users,
  Wallet,
  Wheat,
  WifiOff,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How LayerFlow turns your daily egg count into feed cost, profit, and an early warning when something's off.",
};

const STEPS = [
  {
    icon: Egg,
    tint: "green" as const,
    title: "Your eggs",
    copy: "Log the morning collection in under a minute — eggs collected, broken and dirty counts, and a breakdown by size. Flock health goes in alongside it: mortality and vaccinations, so the day's full picture is in one place.",
  },
  {
    icon: Wheat,
    tint: "amber" as const,
    title: "Your cost",
    copy: "Feed and expenses get logged against the day they happened. Feed can be priced per kilo or by the sack — tell LayerFlow the sack size and price, and it works out the cost per kilo for you.",
  },
  {
    icon: Wallet,
    tint: "violet" as const,
    title: "Your profit",
    copy: "Record sales as they happen — by tray or by egg, to a customer on file or a walk-in, paid in full or on credit. LayerFlow nets revenue against feed and expenses to show estimated operating profit, not just revenue.",
  },
  {
    icon: TrendingUp,
    tint: "teal" as const,
    title: "Your decision",
    copy: "Reports and analytics turn the daily numbers into trends — laying rate, feed cost per hen, profit over time. Alerts flag a production drop or low stock before it becomes a real problem.",
  },
];

const BUILT_FOR = [
  {
    icon: WifiOff,
    tint: "rose" as const,
    title: "Works without signal",
    copy: "Recording works offline. LayerFlow syncs automatically once you're back in range, so a weak connection at the coop never costs you a day's numbers.",
  },
  {
    icon: Users,
    tint: "teal" as const,
    title: "One account, several farms",
    copy: "Run more than one farm or bring on staff — farmhands, managers, and clerks each get their own login, scoped to what they need to do.",
  },
  {
    icon: PhilippinePeso,
    tint: "amber" as const,
    title: "Priced for the Philippines",
    copy: "Pesos, trays, and Philippine time zones by default — not a currency picker bolted onto a tool built for somewhere else.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-4 py-14 text-center">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">How LayerFlow works</h1>
          <p className="mt-2 text-muted-foreground">
            Four numbers, in the order they matter — from this morning&apos;s collection to the
            decision it should change.
          </p>

          <div className="mt-10">
            <DashboardMockup />
          </div>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto w-full max-w-4xl px-4 py-14">
            <Reveal>
              <div className="flex flex-col gap-8">
                {STEPS.map((step, index) => (
                  <div key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <IconChip icon={step.icon} tint={step.tint} />
                      {index < STEPS.length - 1 && (
                        <span className="mt-2 w-px flex-1 bg-border" aria-hidden />
                      )}
                    </div>
                    <div className="pb-2">
                      <h2 className="font-semibold">
                        {index + 1}. {step.title}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{step.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-4 py-14">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">Built for how a farm actually runs</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {BUILT_FOR.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
                >
                  <IconChip icon={item.icon} tint={item.tint} />
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-4xl px-4 py-16">
            <Reveal>
              <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-primary/5 px-6 py-12 text-center">
                <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
                  See the whole toolkit
                </h2>
                <p className="max-w-md text-muted-foreground">
                  This is the flow start to finish. The full feature list covers everything else
                  along the way.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                    Start free
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link href="/features" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                    See all features
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
