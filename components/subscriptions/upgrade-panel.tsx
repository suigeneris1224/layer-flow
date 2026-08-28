import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { UpgradePrompt } from "@/lib/subscriptions/entitlements";

/**
 * What a farmer sees where a feature their plan does not include would be.
 *
 * A locked feature must never render as a broken screen or a button that
 * fails when pressed. The wording comes from `featureLockedPrompt`, so the
 * plan that unlocks it is read from lib/subscriptions/plans.ts rather than
 * restated here and left to go stale.
 */
export function UpgradePanel({ prompt }: { prompt: UpgradePrompt }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center">
      <Lock className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium">{prompt.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{prompt.message}</p>
      </div>
      <Link href="/pricing" className={cn(buttonVariants({ size: "md" }), "mt-1")}>
        {prompt.ctaLabel}
      </Link>
    </div>
  );
}
