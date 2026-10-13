import type { LucideIcon } from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import type { Feature } from "@/lib/subscriptions/plans";
import { PlanBadge } from "./plan-badge";

/** One capability or problem, as a card in a marketing grid. */
export function FeatureCard({
  icon,
  tint,
  title,
  copy,
  plan,
}: {
  icon: LucideIcon;
  tint: ChipTint;
  title: string;
  copy: string;
  /**
   * The gate that unlocks this capability, for its plan pill -- `null` for an
   * ungated one ("All plans"). Omit entirely for no pill (problem cards).
   */
  plan?: Feature | null;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-2">
        <IconChip icon={icon} tint={tint} />
        {plan !== undefined && <PlanBadge feature={plan} />}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
      </div>
    </div>
  );
}
