import Link from "next/link";
import type { Route } from "next";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  annualSavingsPercent,
  formatPlanPrice,
  type BillingPeriod,
  type PlanDefinition,
} from "@/lib/subscriptions/plans";

/**
 * A single plan's card -- price, tagline, a few bullets, one CTA. Shared by
 * the public /pricing page, the homepage teaser, and Settings > Subscription's
 * plan cards, which used to be three near-identical copies of this same
 * markup. Presentational only: callers decide what the bullets say and where
 * the CTA goes, since that differs by context (plan limits vs feature
 * highlights, "Start free" vs "Upgrade to Pro").
 */
export function PlanCard({
  plan,
  period,
  bullets,
  cta,
  isCurrent = false,
  showMarketingHighlight = true,
  size = "default",
}: {
  plan: PlanDefinition;
  period: BillingPeriod;
  bullets: string[];
  /** Null when there's nothing to do from here (the current plan, or a plan change this app has no self-service flow for). */
  cta: { href: Route; label: string } | null;
  /** The signed-in farm's plan -- takes over the highlight treatment from `plan.highlight`'s marketing badge, which stops being relevant once you're already on the plan. */
  isCurrent?: boolean;
  /** Off on an authenticated account's own billing page, where a "Most popular" badge on a plan that isn't yours reads as contradicting "Current plan" rather than as marketing. On by default for /pricing and the landing teaser. */
  showMarketingHighlight?: boolean;
  /** "compact" is the landing-page teaser size: smaller heading/price, no audience line. */
  size?: "default" | "compact";
}) {
  const featured = !isCurrent && showMarketingHighlight && Boolean(plan.highlight);
  const savings = period === "ANNUAL" ? annualSavingsPercent(plan) : null;
  const compact = size === "compact";
  const Heading = compact ? "h3" : "h2";

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-surface p-5",
        isCurrent
          ? "border-primary shadow-card ring-2 ring-primary"
          : featured
            ? "border-primary shadow-card ring-1 ring-primary"
            : "border-border"
      )}
    >
      {isCurrent ? (
        <span className="mb-2 self-start rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
          Current plan
        </span>
      ) : (
        showMarketingHighlight &&
        plan.highlight && (
          <span className="mb-2 self-start rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {plan.highlight}
          </span>
        )
      )}

      <Heading className={cn("font-semibold", compact ? "text-lg" : "text-xl")}>
        {plan.name}
      </Heading>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

      <p className={cn("flex flex-wrap items-baseline gap-2", compact ? "mt-3" : "mt-4")}>
        <span className={cn("font-bold tabular", compact ? "text-2xl" : "text-3xl")}>
          {formatPlanPrice(plan, period)}
        </span>
        <span className="text-sm text-muted-foreground">
          /{period === "ANNUAL" ? "year" : "month"}
        </span>
        {savings !== null && (
          <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs font-medium text-good">
            Save {savings}%
          </span>
        )}
      </p>

      {!compact && <p className="mt-3 text-sm text-muted-foreground">{plan.audience}</p>}

      {cta && (
        <Link
          href={cta.href}
          className={cn(
            buttonVariants({ variant: featured ? "primary" : "outline", block: true }),
            "mt-5"
          )}
        >
          {cta.label}
        </Link>
      )}

      <ul className="mt-5 flex flex-col gap-1.5 text-sm">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-baseline gap-2">
            <Check className="size-3.5 shrink-0 translate-y-0.5 text-primary" aria-hidden />
            <span className="tabular">{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
