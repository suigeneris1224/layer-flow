"use client";

import { useState } from "react";
import { CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import { ManualQrPayment } from "./manual-qr-payment";

type PaymentMethod = "automated" | "manual";

/**
 * Payment-method selector for /checkout.
 *
 * Styled like components/pricing/billing-period-toggle.tsx (there is no
 * formal Tabs component in this codebase). "Automated" is disabled --
 * PayMongo isn't wired up yet, see docs/billing.md -- kept visible so the
 * option reads as "coming soon", not missing.
 */
export function PaymentMethodTabs({
  plan,
  billingPeriod,
  amountCentavos,
  payerNameDefault,
}: {
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
  payerNameDefault: string;
}) {
  const [method] = useState<PaymentMethod>("manual");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Payment method"
        className="inline-flex flex-col gap-2 rounded-lg border border-border bg-surface p-1 sm:flex-row"
      >
        <button
          type="button"
          disabled
          aria-pressed={false}
          className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground opacity-60"
        >
          <CreditCard className="size-4" aria-hidden />
          Card / GCash Automated (PayMongo)
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            Coming soon
          </span>
        </button>
        <button
          type="button"
          aria-pressed={method === "manual"}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            method === "manual"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <QrCode className="size-4" aria-hidden />
          Manual QR / Bank Transfer
        </button>
      </div>

      {method === "manual" && (
        <ManualQrPayment
          plan={plan}
          billingPeriod={billingPeriod}
          amountCentavos={amountCentavos}
          payerNameDefault={payerNameDefault}
        />
      )}
    </div>
  );
}
