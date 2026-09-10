import type { Metadata } from "next";
import { getBetaSettings } from "@/lib/data/admin";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { BetaPanel } from "./beta-panel";

export const metadata: Metadata = { title: "Admin — Beta settings" };

export const dynamic = "force-dynamic";

export default async function AdminBetaSettingsPage() {
  const betaSettings = await getBetaSettings();

  return (
    <PageShell>
      <PageHeader
        title="Beta settings"
        description="Control who gets complimentary Pro access before real billing exists."
      />
      <BetaPanel
        enabled={betaSettings.enabled}
        maxTesters={betaSettings.maxTesters}
        testers={betaSettings.testers}
      />
    </PageShell>
  );
}
