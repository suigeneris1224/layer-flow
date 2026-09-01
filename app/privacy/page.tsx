import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What LayerFlow stores about your farm, and what it never does with it.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader title="Privacy" description="Plain language, not a legal wall." />

          <div className="mt-4 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">What we store</h2>
              <p className="mt-1">
                Your account details (name, email), your farm&apos;s records (production, feed,
                mortality, vaccinations, sales, expenses, customers), and basic usage logs needed
                to run the product. Data is hosted with Supabase, isolated per farm by row-level
                security — no farm can read another farm&apos;s data, including us, outside of what&apos;s
                needed to operate the service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">What we don&apos;t do</h2>
              <p className="mt-1">
                We don&apos;t sell your data. We don&apos;t share it with anyone outside the small team
                operating LayerFlow, except infrastructure providers strictly necessary to run
                the app (hosting, database, email delivery). We don&apos;t use your farm data to train
                any third-party product.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Your control</h2>
              <p className="mt-1">
                You can export your data as CSV from within the app on plans that include export,
                and you can ask us to delete your account and its data at any time by emailing{" "}
                <a href="/contact" className="text-primary hover:underline">
                  our support address
                </a>
                .
              </p>
            </section>

            <p className="text-xs">
              This page describes our current practice in plain terms. It isn&apos;t a substitute for
              formal legal advice, and we&apos;ll update it if that ever changes materially.
            </p>
          </div>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
