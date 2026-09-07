import type { Metadata } from "next";
import { requireFarmContext } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { SupportForm } from "./support-form";

export const metadata: Metadata = { title: "Support" };

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const context = await requireFarmContext();
  const priority = context.plan === "PRO" || context.isBetaOverride;

  return (
    <PageShell width="reading">
      <PageHeader
        title="Support"
        description="Questions about your farm, your account, or a plan -- send us a message."
      />

      {priority && (
        <StatusNote tone="good">
          You&apos;re on Pro -- your requests get priority handling.
        </StatusNote>
      )}

      <SupportForm priority={priority} />
    </PageShell>
  );
}
