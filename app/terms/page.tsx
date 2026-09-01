import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Terms",
  description: "The basic terms of using LayerFlow.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader title="Terms" description="Plain language, not a legal wall." />

          <div className="mt-4 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-base font-semibold text-foreground">The short version</h2>
              <p className="mt-1">
                Use LayerFlow to run your own farm&apos;s records. Don&apos;t use it to store data you
                don&apos;t have the right to, and don&apos;t try to break, resell, or scrape the service.
                We&apos;ll do our best to keep it running and your data safe; software has bugs and
                outages happen, so we can&apos;t guarantee zero downtime or promise the service is fit
                for every use.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Billing</h2>
              <p className="mt-1">
                Paid plans are billed monthly. Changing plans never deletes your records — moving
                down just limits how much new data you can add until you move back up. You can
                cancel at any time.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">Your data, your farm</h2>
              <p className="mt-1">
                The records you enter belong to you. See{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  our privacy page
                </a>{" "}
                for how we store and protect it.
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
