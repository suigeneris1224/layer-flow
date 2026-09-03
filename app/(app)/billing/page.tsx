import type { Metadata } from "next";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { isProduction } from "@/lib/config/env";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { RenewalBanner } from "@/components/subscriptions/renewal-banner";
import { BillingPanel } from "./billing-panel";
import { DevPlanSwitcher } from "./dev-plan-switcher";

export const metadata: Metadata = { title: "Billing" };

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const context = await requireFarmContext();
  const canManage = canManageBilling(context);

  if (!canManage) {
    return (
      <PageShell width="reading">
        <PageHeader title="Billing" description="Your plan and billing details." />
        <StatusNote tone="info" title="Owner only">
          Only the farm owner can view billing details.
        </StatusNote>
      </PageShell>
    );
  }

  const { currentPeriodEnd } = await getSubscriptionPeriod(context.farmId);

  return (
    <PageShell>
      <PageHeader title="Billing" description="Your plan and billing details." />

      <RenewalBanner
        plan={context.plan}
        status={context.subscriptionStatus}
        currentPeriodEnd={currentPeriodEnd}
        showManageLink={false}
      />

      <BillingPanel
        planName={PLANS[context.plan].name}
        price={formatPlanPrice(PLANS[context.plan])}
        status={context.subscriptionStatus}
        currentPeriodEnd={currentPeriodEnd}
      />

      {!isProduction && (
        <DevPlanSwitcher currentPlan={context.plan} currentStatus={context.subscriptionStatus} />
      )}
    </PageShell>
  );
}
