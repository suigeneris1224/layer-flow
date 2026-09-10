import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

const OPTIONS: { value: "all" | "monthly" | "annual"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

/**
 * Plain links, not a client toggle -- matches FarmSearch's URL-as-state idiom
 * so the two filters compose (each preserves the other's param) without
 * needing shared client state between them.
 */
export function BillingPeriodFilter({ period, q }: { period: string; q: string }) {
  const href = (value: string): Route => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (value !== "all") params.set("period", value);
    const query = params.toString();
    return (query ? `/admin/subscriptions?${query}` : "/admin/subscriptions") as Route;
  };

  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((option) => {
        const active = (period || "all") === option.value;
        return (
          <Link
            key={option.value}
            href={href(option.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-md border px-3 text-sm transition-colors",
              active
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "border-input bg-surface hover:border-foreground/30 hover:bg-muted"
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
