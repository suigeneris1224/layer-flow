import { AlertCircle, CheckCircle2, Layers, TriangleAlert } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FlockStatus } from "@/lib/domain/presentation";
import type { ActiveFlockSummary } from "@/lib/data/dashboard";

/**
 * Flock summary.
 *
 * This reports **mortality**, never health. LayerFlow counts birds; it cannot
 * examine them, and telling a farmer "no health issues detected" while a
 * problem is brewing would be worse than saying nothing (spec section 28).
 * The wording comes from `flockStatusLine`, which has a test asserting no
 * health vocabulary can creep back in.
 */
const TONES = {
  good: { icon: CheckCircle2, text: "text-good", ring: "bg-good/10" },
  warn: { icon: TriangleAlert, text: "text-warn", ring: "bg-warn/10" },
  bad: { icon: AlertCircle, text: "text-bad", ring: "bg-bad/10" },
} as const;

export function FlockStatusPanel({
  status,
  flocks,
  className,
}: {
  status: FlockStatus;
  flocks: ActiveFlockSummary[];
  className?: string;
}) {
  const tone = TONES[status.tone];
  const Icon = tone.icon;

  return (
    <Panel title="Flock summary" className={className}>
      <div className="flex items-start gap-3">
        <span
          className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-lg", tone.ring)}
          aria-hidden
        >
          <Icon className={cn("size-5", tone.text)} />
        </span>

        <div className="min-w-0">
          {/* Colour is never the only signal: the icon and these words carry it. */}
          <p className={cn("text-base font-bold", tone.text)}>{status.headline}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{status.detail}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        {flocks.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No active flocks"
            message="Add a flock to start recording production."
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {flocks.map((flock) => (
              <li key={flock.id} className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{flock.name}</p>
                  <p className="truncate text-xs text-muted-foreground tabular">
                    {formatNumber(flock.currentHens)} hens
                    {flock.houseName ? ` · ${flock.houseName}` : ""}
                  </p>
                </div>

                <span className="shrink-0 text-right text-xs tabular">
                  {flock.eggsToday > 0 ? (
                    <>
                      <span className="font-medium">{formatNumber(flock.eggsToday)}</span>
                      <span className="text-muted-foreground"> eggs</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not recorded</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
