import type { Metadata } from "next";
import type { Route } from "next";
import { requireFarmContext, requireUser } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { getSubscriptionPeriod } from "@/lib/data/subscriptions";
import { getManualPaymentsForOwner } from "@/lib/data/manual-payments";
import { getUsageSummary } from "@/lib/data/usage";
import {
  describeLimit,
  FEATURE_LABELS,
  LIMIT_LABELS,
  PLANS,
  PLAN_FEATURE_ROWS,
  PLAN_ORDER,
  formatPlanPrice,
  type LimitKey,
} from "@/lib/subscriptions/plans";
import { PageHeader } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { RenewalBanner } from "@/components/subscriptions/renewal-banner";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { BillingPanel } from "./billing-panel";
import { DevPlanSwitcher } from "./dev-plan-switcher";

const USAGE_LIMIT_KEYS: LimitKey[] = ["farms", "houses", "active_flocks", "users", "customers"];

export const metadata: Metadata = { title: "Billing" };

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUser();
  const context = await requireFarmContext();
  const canManage = canManageBilling(context);

  if (!canManage) {
    return (
      <div className="flex max-w-3xl flex-col gap-4 lg:gap-5">
        <div className="md:hidden">
          <PageHeader title="Billing" description="Your plan and billing details." />
        </div>
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
  const currentRank = PLAN_ORDER.indexOf(context.plan);
  const limits = PLANS[context.plan].limits;

  return (
    <>
      <div className="md:hidden">
        <PageHeader title="Billing" description="Your plan and billing details." />
      </div>

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
        plan={context.plan}
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

      {!context.isBetaOverride && !pendingManualPayment && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const isCurrent = id === context.plan;
            const rank = PLAN_ORDER.indexOf(id);

            // Any Starter/Pro move -- either direction -- goes through the
            // same manual-payment checkout: submitManualPaymentAction and the
            // admin approve/reject actions are rank-agnostic, so a downgrade
            // claim is processed exactly like an upgrade one. Free is the one
            // real gap: there's no submission path for it (nothing to pay
            // for) and no cancellation flow built yet, so that still detours
            // to support.
            const cta = isCurrent
              ? null
              : id === "FREE"
                ? { href: "/settings/support" as Route, label: "Downgrade to Free" }
                : {
                    href: `/checkout?plan=${id}&period=${billingPeriod}` as Route,
                    label:
                      rank > currentRank
                        ? `Upgrade to ${PLANS[id].name}`
                        : `Downgrade to ${PLANS[id].name}`,
                  };

            return (
              <PlanCard
                key={id}
                plan={PLANS[id]}
                period={billingPeriod}
                bullets={PLAN_FEATURE_ROWS[id].map((feature) => FEATURE_LABELS[feature])}
                cta={cta}
                isCurrent={isCurrent}
                showMarketingHighlight={false}
              />
            );
          })}
        </div>
      )}

      {isPlatformAdmin(user.email) && (
        <DevPlanSwitcher
          currentPlan={context.plan}
          currentStatus={context.subscriptionStatus}
          currentBillingPeriod={billingPeriod}
        />
      )}
    </>
  );
}
