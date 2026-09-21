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
 * formal Tabs component in this codebase). "Automated" now runs a PayMongo
 * GCash checkout (test-mode keys until the business account is approved --
 * see lib/subscriptions/paymongo.ts); Manual QR stays fully available as a
 * fallback.
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
  const [method, setMethod] = useState<PaymentMethod>("automated");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Payment method"
        className="inline-flex gap-2 rounded-lg border border-border bg-surface p-1"
      >
        <button
          type="button"
          aria-pressed={method === "automated"}
          onClick={() => setMethod("automated")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-sm font-medium transition-colors sm:gap-2 sm:px-4",
            method === "automated"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CreditCard className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            <span className="sm:hidden">GCash</span>
            <span className="hidden sm:inline">Pay with GCash</span>
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
