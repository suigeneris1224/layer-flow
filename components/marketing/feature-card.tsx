import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, type LucideIcon } from "lucide-react";
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
  href,
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
  /** Optional "Learn more" link, e.g. the feature's section in /docs. */
  href?: string;
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
      {href && (
        <Link
          href={href as Route}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary-strong hover:underline"
        >
          Learn more
          <span className="sr-only"> about {title.toLowerCase()}</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
