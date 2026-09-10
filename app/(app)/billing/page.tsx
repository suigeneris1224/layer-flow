import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { isProduction } from "@/lib/config/env";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { getManualPaymentsForOwner } from "@/lib/data/manual-payments";
import { PLANS, PLAN_ORDER, formatPlanPrice } from "@/lib/subscriptions/plans";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const [{ currentPeriodEnd, billingPeriod }, manualPayments] = await Promise.all([
    getSubscriptionPeriod(context.ownerId),
    getManualPaymentsForOwner(context.ownerId),
  ]);
  const pendingManualPayment = manualPayments.find((payment) => payment.status === "PENDING");
  const upgradablePlans = PLAN_ORDER.filter((id) => id !== "FREE" && id !== context.plan);

  return (
    <PageShell>
      <PageHeader title="Billing" description="Your plan and billing details." />

      {pendingManualPayment && (
        <StatusNote tone="info" title="Payment being verified">
          Your manual payment for the {PLANS[pendingManualPayment.plan].name} plan is being
          reviewed. We&apos;ll update your plan once an admin approves it.
        </StatusNote>
      )}

      {context.isBetaOverride ? (
        <StatusNote tone="info" title="Beta access">
          You have complimentary Beta access to {PLANS[context.plan].name} features. This isn&apos;t
          a paid subscription — there&apos;s nothing to renew or cancel.
        </StatusNote>
      ) : (
        <RenewalBanner
          plan={context.plan}
          status={context.subscriptionStatus}
          currentPeriodEnd={currentPeriodEnd}
          showManageLink={false}
        />
      )}

      <BillingPanel
        planName={PLANS[context.plan].name}
        price={formatPlanPrice(PLANS[context.plan], billingPeriod)}
        billingPeriod={billingPeriod}
        status={context.subscriptionStatus}
        currentPeriodEnd={currentPeriodEnd}
      />

      {!context.isBetaOverride && !pendingManualPayment && upgradablePlans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {upgradablePlans.map((id) => (
            <Link
              key={id}
              href={`/checkout?plan=${id}&period=${billingPeriod}` as Route}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Upgrade to {PLANS[id].name}
            </Link>
          ))}
        </div>
      )}

      {!isProduction && (
        <DevPlanSwitcher
          currentPlan={context.plan}
          currentStatus={context.subscriptionStatus}
          currentBillingPeriod={billingPeriod}
        />
      )}
    </PageShell>
  );
}
