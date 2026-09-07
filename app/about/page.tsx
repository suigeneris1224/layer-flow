import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "About",
  description: "What LayerFlow is, why it exists, and who it's built for.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader title="About LayerFlow" />

          <div className="mt-4 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">What it is</h2>
              <p className="mt-1">
                LayerFlow is a mobile-first farm management platform built specifically for layer
                and poultry farms. It replaces the notebook, the group chat, and the scattered
                spreadsheets with one place to record daily egg production, feed and flock
                health, sales and customers, and expenses — then turns those numbers into
                reports, alerts, and an estimated operating profit you can actually trust.
              </p>
              <p className="mt-2">
                It works offline first, so a weak signal at the coop never costs you a day&apos;s
                numbers, and it&apos;s priced and timed for the Philippines by default — pesos,
                trays, and Philippine time zones, not a currency picker bolted onto a tool built
                for somewhere else. See{" "}
                <Link href="/how-it-works" className="text-primary hover:underline">
                  how it works
                </Link>{" "}
                or the{" "}
                <Link href="/features" className="text-primary hover:underline">
                  full feature list
                </Link>{" "}
                for the details.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Why it exists</h2>
              <p className="mt-1">
                LayerFlow started as a way to answer one question a layer farm asks every day:
                what did the flock actually earn? Egg counts live in one notebook, feed receipts
                in another, and sales somewhere else entirely — by the time anyone adds it up,
                the week is over.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Who it&apos;s for</h2>
              <p className="mt-1">
                We built LayerFlow for small and medium layer farms in the Philippines — the kind
                with 100 to 5,000 hens, a phone in the poultry house, and better things to do than
                fight a spreadsheet. It connects production, feed, sales and expenses in one
                place, so the numbers are there the moment you need them, not at month-end.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Where we are</h2>
              <p className="mt-1">
                We&apos;re early. LayerFlow is built and used by a small team working directly
                with layer farms, starting in Cebu. We&apos;d rather ship something honest and
                useful than promise more than the product does today — if a feature isn&apos;t
                built yet, we say so.
              </p>
            </section>
          </div>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
