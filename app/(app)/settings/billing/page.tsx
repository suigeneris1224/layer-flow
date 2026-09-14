import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { isProduction } from "@/lib/config/env";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { getManualPaymentsForOwner } from "@/lib/data/manual-payments";
import { getUsageSummary } from "@/lib/data/usage";
import {
  describeLimit,
  LIMIT_LABELS,
  PLANS,
  PLAN_ORDER,
  formatPlanPrice,
  type LimitKey,
} from "@/lib/subscriptions/plans";
import { PageHeader } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RenewalBanner } from "@/components/subscriptions/renewal-banner";
import { BillingPanel } from "./billing-panel";
import { DevPlanSwitcher } from "./dev-plan-switcher";

const USAGE_LIMIT_KEYS: LimitKey[] = ["farms", "houses", "active_flocks", "users", "customers"];

export const metadata: Metadata = { title: "Billing" };

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const context = await requireFarmContext();
  const canManage = canManageBilling(context);

  if (!canManage) {
    return (
      <div className="flex max-w-3xl flex-col gap-4 lg:gap-5">
        <PageHeader title="Billing" description="Your plan and billing details." />
        <StatusNote tone="info" title="Owner only">
          Only the farm owner can view billing details.
        </StatusNote>
      </div>
    );
  }

  const [{ currentPeriodEnd, billingPeriod }, manualPayments, usage] = await Promise.all([
    getSubscriptionPeriod(context.ownerId),
    getManualPaymentsForOwner(context.ownerId),
    getUsageSummary(context),
  ]);
  const pendingManualPayment = manualPayments.find((payment) => payment.status === "PENDING");
  const upgradablePlans = PLAN_ORDER.filter((id) => id !== "FREE" && id !== context.plan);
  const limits = PLANS[context.plan].limits;

  return (
    <>
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

      <Panel title="Current usage">
        <dl className="flex flex-col gap-3">
          {USAGE_LIMIT_KEYS.map((key) => {
            const limit = limits[key];
            const used = usage[key];
            return (
              <div key={key} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground capitalize">
                  {LIMIT_LABELS[key].plural}
                </dt>
                <dd className="text-sm font-medium tabular">
                  {used} / {describeLimit(key, limit)}
                </dd>
              </div>
            );
          })}
        </dl>
      </Panel>

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
    </>
  );
}
