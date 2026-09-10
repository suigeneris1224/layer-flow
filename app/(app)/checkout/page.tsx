import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { PLANS, PLAN_ORDER, formatPlanPrice, priceCentavosFor } from "@/lib/subscriptions/plans";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { Panel } from "@/components/ui/panel";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import { PaymentMethodTabs } from "./payment-method-tabs";

export const metadata: Metadata = { title: "Checkout" };

export const dynamic = "force-dynamic";

const BILLING_PERIODS: BillingPeriod[] = ["MONTHLY", "ANNUAL"];
const CHECKOUT_PLANS = PLAN_ORDER.filter((id) => id !== "FREE");

function isCheckoutPlan(value: string | undefined): value is SubscriptionPlan {
  return value !== undefined && (CHECKOUT_PLANS as readonly string[]).includes(value);
}

function isBillingPeriod(value: string | undefined): value is BillingPeriod {
  return BILLING_PERIODS.includes(value as BillingPeriod);
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; period?: string }>;
}) {
  const { plan: planParam, period: periodParam } = await searchParams;

  if (!isCheckoutPlan(planParam) || !isBillingPeriod(periodParam)) {
    redirect("/pricing");
  }

  const context = await requireFarmContext();
  if (!canManageBilling(context)) {
    return (
      <PageShell width="reading">
        <PageHeader title="Checkout" description="Upgrade your plan." />
        <StatusNote tone="info" title="Owner only">
          Only the account owner can change the plan.
        </StatusNote>
      </PageShell>
    );
  }

  const plan = PLANS[planParam];
  const amount = formatPlanPrice(plan, periodParam);
  const amountCentavos = priceCentavosFor(plan, periodParam);

  return (
    <PageShell width="reading">
      <PageHeader title="Checkout" description="Choose how you'd like to pay." />

      <Panel title="Order summary">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{plan.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Price</dt>
            <dd className="font-medium">
              {amount} / {periodParam === "ANNUAL" ? "year" : "month"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Billing cycle</dt>
            <dd className="font-medium">{periodParam === "ANNUAL" ? "Annual" : "Monthly"}</dd>
          </div>
        </dl>
      </Panel>

      <PaymentMethodTabs
        plan={planParam}
        billingPeriod={periodParam}
        amountCentavos={amountCentavos}
        payerNameDefault={context.farmName}
      />
    </PageShell>
  );
}
