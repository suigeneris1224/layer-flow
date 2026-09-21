"use client";

import { useState } from "react";
import { CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import { ManualQrPayment } from "./manual-qr-payment";
import { AutomatedCheckout } from "./automated-checkout";

type PaymentMethod = "automated" | "manual";

/**
 * Payment-method selector for /checkout.
 *
 * Styled like components/pricing/billing-period-toggle.tsx (there is no
 * formal Tabs component in this codebase). "Pay online" is disabled/"Coming
 * soon" here on purpose -- the PayMongo integration underneath
 * (createPaymongoCheckoutAction, AutomatedCheckout, the webhook route) is
 * fully built and works against PayMongo's test-mode keys, but is only
 * switched live on the tab itself once BILLING_PROVIDER=paymongo runs with
 * real (sk_live_...) keys in production -- see docs/billing.md. Flip
 * `disabled`/the "Coming soon" badge off here when that's ready; nothing
 * else needs to change.
 */
export function PaymentMethodTabs({
  plan,
  billingPeriod,
  amountCentavos,
  payerNameDefault,
  paymentNote,
}: {
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
  payerNameDefault: string;
  paymentNote: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>("manual");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Payment method"
        className="inline-flex gap-2 rounded-lg border border-border bg-surface p-1"
      >
        <button
          type="button"
          disabled
          aria-pressed={false}
          className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground opacity-60 sm:gap-2 sm:px-4"
        >
          <CreditCard className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Pay online</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            <span className="sm:hidden">Soon</span>
            <span className="hidden sm:inline">Coming soon</span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={method === "manual"}
          onClick={() => setMethod("manual")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-sm font-medium transition-colors sm:gap-2 sm:px-4",
            method === "manual"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <QrCode className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            <span className="sm:hidden">Manual</span>
            <span className="hidden sm:inline">Manual QR / Bank Transfer</span>
          </span>
        </button>
      </div>

      {method === "automated" ? (
        <AutomatedCheckout plan={plan} billingPeriod={billingPeriod} />
      ) : (
        <ManualQrPayment
          plan={plan}
          billingPeriod={billingPeriod}
          amountCentavos={amountCentavos}
          payerNameDefault={payerNameDefault}
          paymentNote={paymentNote}
        />
      )}
    </div>
  );
}
