import { planAvailabilityLabel, type Feature } from "@/lib/subscriptions/plans";
import { cn } from "@/lib/utils";

/**
 * The small plan pill beside a feature ("All plans", "Starter & Pro", "Pro").
 * Takes the gating feature rather than a string, so the label always comes
 * from lib/subscriptions/plans.ts -- pass `null` for an ungated capability.
 */
export function PlanBadge({ feature, className }: { feature: Feature | null; className?: string }) {
  const label = planAvailabilityLabel(feature);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        label === "All plans" ? "bg-chip-green text-chip-green-fg" : "bg-muted text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}
