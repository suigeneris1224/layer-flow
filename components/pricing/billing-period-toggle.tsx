"use client";

import { cn } from "@/lib/utils";
import type { BillingPeriod } from "@/lib/subscriptions/plans";

const OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "ANNUAL", label: "Annual" },
];

/** Monthly/annual segmented toggle, shared by /pricing and the landing page's pricing section. */
export function BillingPeriodToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Billing period"
      className="inline-flex rounded-lg border border-border bg-surface p-1"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={period === option.value}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            period === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
