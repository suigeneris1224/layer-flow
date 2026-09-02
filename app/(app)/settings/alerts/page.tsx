import type { Metadata } from "next";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageAlertThresholds } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getAlertThresholdOverrides } from "@/lib/data/alert-thresholds";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { StatusNote } from "@/components/ui/states";
import { ThresholdForm } from "./threshold-form";

export const metadata: Metadata = { title: "Alert settings" };

export const dynamic = "force-dynamic";

export default async function AlertSettingsPage() {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "advanced_alerts")) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Alert settings"
          description="Tune the thresholds behind your dashboard alerts and notifications."
        />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "advanced_alerts")} />
      </PageShell>
    );
  }

  const overrides = await getAlertThresholdOverrides(context.farmId);
  const canEdit = canManageAlertThresholds(context);

  return (
    <PageShell width="reading">
      <PageHeader
        title="Alert settings"
        description="Tune the thresholds behind your dashboard alerts and notifications. Leave a field blank to use the default."
      />

      {canEdit ? (
        <ThresholdForm overrides={overrides} />
      ) : (
        <StatusNote tone="info">
          Only the farm owner or a manager can change alert settings.
        </StatusNote>
      )}
    </PageShell>
  );
}
