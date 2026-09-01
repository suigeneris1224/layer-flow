import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "About",
  description: "Why LayerFlow exists and who it's built for.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader title="About LayerFlow" />

          <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              LayerFlow started as a way to answer one question a layer farm asks every day:
              what did the flock actually earn? Egg counts live in one notebook, feed receipts in
              another, and sales somewhere else entirely — by the time anyone adds it up, the week
              is over.
            </p>
            <p>
              We built LayerFlow for small and medium layer farms in the Philippines — the kind
              with 100 to 5,000 hens, a phone in the poultry house, and better things to do than
              fight a spreadsheet. It connects production, feed, sales and expenses in one place,
              so the numbers are there the moment you need them, not at month-end.
            </p>
            <p>
              We&apos;re early. LayerFlow is built and used by a small team working directly with
              layer farms, starting in Cebu. We&apos;d rather ship something honest and useful than
              promise more than the product does today — if a feature isn&apos;t built yet, we say so.
            </p>
          </div>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
