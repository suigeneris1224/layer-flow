import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { PLANS, PLAN_ORDER, TRIAL_DAYS, formatPlanPrice, priceCentavosFor } from "@/lib/subscriptions/plans";
import { canStartTrial } from "@/lib/subscriptions/trial";
import { serverEnv } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generatePaymentNote } from "@/lib/domain/manual-payment-note";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { Panel } from "@/components/ui/panel";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import { PaymentMethodTabs } from "./payment-method-tabs";
import { WaitlistForm } from "./waitlist-form";

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
        <PageHeader title="Checkout" description="Change your plan." />
        <StatusNote tone="info" title="Owner only">
          Only the account owner can change the plan.
        </StatusNote>
      </PageShell>
    );
  }

  const plan = PLANS[planParam];
  const amount = formatPlanPrice(plan, periodParam);
  const amountCentavos = priceCentavosFor(plan, periodParam);
  const paymentNote = generatePaymentNote(context.ownerId);
  const validation = serverEnv.billingMode === "validation";

  // Validation mode takes no payment: the waitlist (and a free trial, when
  // eligible) replaces the payment methods. Read through the RLS client --
  // plan_waitlist lets an owner see only their own entry.
  let waitlistForm: React.ReactNode = null;
  if (validation) {
    const supabase = await createSupabaseServerClient();
    const { data: entry } = await supabase
      .from("plan_waitlist")
      .select("mobile_number, flock_size, trial_started_at")
      .eq("owner_id", context.ownerId)
      .maybeSingle();
    const trialAvailable =
      !context.isBetaOverride &&
      canStartTrial({ plan: context.plan, status: context.subscriptionStatus }, entry?.trial_started_at ?? null);

    waitlistForm = (
      <WaitlistForm
        plan={planParam}
        planName={plan.name}
        farmNameDefault={context.farmName}
        mobileDefault={entry?.mobile_number ?? ""}
        flockSizeDefault={entry?.flock_size ?? ""}
        trialAvailable={trialAvailable}
        trialDays={TRIAL_DAYS}
        alreadyJoined={entry !== null}
      />
    );
  }

  return (
    <PageShell width="reading">
      <PageHeader
        title="Checkout"
        description={validation ? "Paid plans open soon." : "Choose how you'd like to pay."}
      />

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
              {validation && <span className="font-normal text-muted-foreground"> when paid plans open</span>}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Billing cycle</dt>
            <dd className="font-medium">{periodParam === "ANNUAL" ? "Annual" : "Monthly"}</dd>
          </div>
        </dl>
      </Panel>

      {validation ? (
        waitlistForm
      ) : (
        <PaymentMethodTabs
          plan={planParam}
          billingPeriod={periodParam}
          amountCentavos={amountCentavos}
          payerNameDefault={context.farmName}
          paymentNote={paymentNote}
        />
      )}
    </PageShell>
  );
}
