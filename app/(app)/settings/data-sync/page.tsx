import type { Metadata } from "next";
import { requireFarmContext } from "@/lib/auth/session";
import { canAccess } from "@/lib/subscriptions/entitlements";
import { PageHeader } from "@/components/layout/page-shell";
import { DataSyncPanel } from "./data-sync-panel";

export const metadata: Metadata = { title: "Data & Sync" };

export default async function DataSyncSettingsPage() {
  const context = await requireFarmContext();

  const offlineEnabled = canAccess(
    { plan: context.plan, status: context.subscriptionStatus },
    "offline_mode"
  );

  return (
    <>
      <div className="md:hidden">
        <PageHeader title="Data & Sync" description="Whether your data is saved and up to date." />
      </div>
      <DataSyncPanel offlineEnabled={offlineEnabled} />
    </>
  );
}
