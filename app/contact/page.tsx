import type { Metadata } from "next";
import { Mail } from "lucide-react";
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

          <div className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-muted-foreground">
              We&apos;re a small team, so email is the most reliable way to reach us. We read every
              message and typically reply within a business day.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={cn(buttonVariants({ variant: "primary" }), "w-fit")}
            >
              <Mail className="size-4" aria-hidden />
              {SUPPORT_EMAIL}
            </a>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            On a paid plan and need faster turnaround? Mention your farm name and plan in your
            email — Pro plans get priority handling.
          </p>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
