"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import { createPaymongoCheckoutAction } from "./actions";

/**
 * The "Automated" tab on /checkout: one button that creates a PayMongo Link
 * for this billing cycle and redirects to PayMongo's hosted checkout page.
 * PayMongo's Links API has no per-request payment-method restriction -- the
 * hosted page shows whichever methods (GCash, Maya, cards, ...) are enabled
 * in the PayMongo Dashboard's Payment Methods settings, and the customer
 * picks there. See lib/subscriptions/paymongo.ts.
 */
export function AutomatedCheckout({
  plan,
  billingPeriod,
}: {
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPay() {
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() =>
        createPaymongoCheckoutAction({ plan, billingPeriod })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.data.checkoutUrl;
    });
  }

  return (
    <Panel title="Pay online">
      <div className="flex flex-col gap-4">
        {error && <StatusNote tone="bad">{error}</StatusNote>}
        <p className="text-sm text-muted-foreground">
          You&apos;ll be taken to PayMongo&apos;s secure checkout, where you can pay with GCash,
          Maya, or a card. Your plan updates automatically the moment payment confirms — no
          waiting for review.
        </p>
        <Button type="button" loading={pending} onClick={onPay} className="w-fit">
          <CreditCard className="size-4" aria-hidden />
          Continue to checkout
        </Button>
      </div>
    </Panel>
  );
}
