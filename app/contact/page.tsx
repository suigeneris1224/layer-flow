import type { Metadata } from "next";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the LayerFlow team, including support.",
};

const SUPPORT_EMAIL = "support@layerflow.ph";

export default function ContactPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader
            title="Contact & support"
            description="Questions about your farm, your account, or a plan — this is the fastest way to reach us."
          />

          <div className="mt-6 grid grid-cols-1 gap-6 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2 sm:divide-x sm:divide-border sm:gap-0">
            <div className="flex flex-col gap-4 sm:pr-6">
              <p className="text-sm text-muted-foreground">
                We&apos;re a small team, so email is the most reliable way to reach us. We read
                every message and typically reply within a business day.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className={cn(buttonVariants({ variant: "primary" }), "w-fit")}
              >
                <Mail className="size-4" aria-hidden />
                {SUPPORT_EMAIL}
              </a>
            </div>

            <div className="flex flex-col gap-3 sm:pl-6">
              <span className="text-sm font-medium text-foreground">Other ways to reach us</span>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>[Business Address — TBD]</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>[Phone Number — TBD]</span>
              </div>
              <a
                href="#"
                className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>Message us on Facebook</span>
              </a>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            On a paid plan and need faster turnaround? Mention your farm name and plan in your
            email — Pro plans get priority handling.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Already signed in? Use{" "}
            <a href="/support" className="font-medium text-primary hover:underline">
              Support
            </a>{" "}
            in your dashboard instead — it reaches us faster.
          </p>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
