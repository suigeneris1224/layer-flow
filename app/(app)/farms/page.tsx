import type { Metadata } from "next";
import { requireFarmContext, getUserFarms } from "@/lib/auth/session";
import { canManageBilling, canManageFarmSettings } from "@/lib/auth/permissions";
import { canCreate, limitReachedPrompt } from "@/lib/subscriptions/entitlements";
import { isProduction } from "@/lib/config/env";
import { getFarmDetail } from "@/lib/data/farms";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import { Panel } from "@/components/ui/panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { BillingPanel } from "./billing-panel";
import { DevPlanSwitcher } from "./dev-plan-switcher";
import { FarmForm } from "./farm-form";
import { FarmSwitcher } from "./farm-switcher";

export const metadata: Metadata = { title: "Farm settings" };

export const dynamic = "force-dynamic";

export default async function FarmsPage() {
  const context = await requireFarmContext();

  const [farms, detail, subscriptionPeriod] = await Promise.all([
    getUserFarms(),
    getFarmDetail(context.farmId),
    getSubscriptionPeriod(context.farmId),
  ]);

  const canEdit = canManageFarmSettings(context);
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  // Any signed-in member of a farm may create a brand new farm they'd own --
  // same as onboarding's createFarmAction, which has no role check either.
  const canAddFarm = canCreate(entitlement, "farms", farms.length);
  const limitPrompt = !canAddFarm ? limitReachedPrompt(entitlement, "farms", farms.length) : null;

  return (
    <PageShell>
      <PageHeader title="Farm settings" description="Your farm's name and location." />

      {!detail ? (
        <StatusNote tone="bad">We couldn&apos;t load this farm&apos;s details.</StatusNote>
      ) : canEdit ? (
        <FarmForm mode="edit" initial={detail} />
      ) : (
        <Panel title={detail.name}>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Barangay</dt>
              <dd>{detail.barangay || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Municipality / City</dt>
              <dd>{detail.municipality}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Province</dt>
              <dd>{detail.province}</dd>
            </div>
          </dl>
          <StatusNote tone="info" className="mt-4">
            Only the farm owner can change farm details.
          </StatusNote>
        </Panel>
      )}

      {farms.length > 1 && (
        <Panel title="Your farms">
          <FarmSwitcher farms={farms} activeFarmId={context.farmId} />
        </Panel>
      )}

      {canAddFarm ? (
        <FarmForm mode="create" />
      ) : (
        limitPrompt && <UpgradePanel prompt={limitPrompt} />
      )}

      {canManageBilling(context) && (
        <BillingPanel
          planName={PLANS[context.plan].name}
          price={formatPlanPrice(PLANS[context.plan])}
          status={context.subscriptionStatus}
          currentPeriodEnd={subscriptionPeriod.currentPeriodEnd}
        />
      )}

      {!isProduction && canManageBilling(context) && (
        <DevPlanSwitcher currentPlan={context.plan} currentStatus={context.subscriptionStatus} />
      )}
    </PageShell>
  );
}
