import type { Metadata } from "next";
import { requireFarmContext, requireUser } from "@/lib/auth/session";
import { getMySupportRequests } from "@/lib/data/support";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { SupportForm } from "./support-form";
import { SupportRequestsList } from "./support-requests-list";

export const metadata: Metadata = { title: "Support" };

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const [user, context] = await Promise.all([requireUser(), requireFarmContext()]);
  const priority = context.plan === "PRO" || context.isBetaOverride;
  const requests = await getMySupportRequests(context.farmId, user.id);

  return (
    <PageShell>
      <PageHeader
        title="Support"
        description="Questions about your farm, your account, or a plan -- send us a message."
      />

      {priority && (
        <StatusNote tone="good">
          You&apos;re on Pro -- your requests get priority handling.
        </StatusNote>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <SupportForm priority={priority} />
        </div>
        <SupportRequestsList requests={requests} timezone={context.timezone} />
      </div>
    </PageShell>
  );
}
