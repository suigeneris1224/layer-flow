import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import type { Alert, AlertLevel } from "@/lib/domain/alerts";
import { cn } from "@/lib/utils";

/**
 * The status band at the top of the dashboard.
 *
 * This is the first thing a farmer reads in the morning, so it is given real
 * presence rather than the flat inline treatment `StatusNote` uses for notes
 * inside a form. The two are deliberately different: `StatusNote` is a remark
 * beside a field, this is the headline of the day.
 *
 * Everything is token-driven and every tone pairs colour with an icon *and*
 * words, per docs/design-system.md section 4 -- the pulse and the tint are
 * reinforcement, never the signal itself. The pulse only runs for warn and
 * bad: an animation that plays when nothing is wrong is noise, and the
 * global prefers-reduced-motion rule stills it either way.
 */

const TONE: Record<
  AlertLevel,
  { wash: string; chip: string; text: string; label: string }
> = {
  good: {
    wash: "bg-[hsl(var(--status-good))]/10",
    chip: "bg-[hsl(var(--status-good))]/20 text-[hsl(var(--status-good))]",
    text: "text-[hsl(var(--status-good))]",
    label: "All clear",
  },
  warn: {
    wash: "bg-[hsl(var(--status-warn))]/10",
    chip: "bg-[hsl(var(--status-warn))]/20 text-[hsl(var(--status-warn))]",
    text: "text-[hsl(var(--status-warn))]",
    label: "Worth a look",
  },
  bad: {
    wash: "bg-[hsl(var(--status-bad))]/10",
    chip: "bg-[hsl(var(--status-bad))]/20 text-[hsl(var(--status-bad))]",
    text: "text-[hsl(var(--status-bad))]",
    label: "Needs attention",
  },
};

const ICONS: Record<AlertLevel, typeof CheckCircle2> = {
  good: CheckCircle2,
  warn: TriangleAlert,
  bad: AlertCircle,
};

const SEVERITY: Record<AlertLevel, number> = { bad: 0, warn: 1, good: 2 };

export function TodayStatus({
  alerts,
  hasRecord,
  className,
}: {
  /** Already summarised and sorted most-severe-first by `summariseAlerts`. */
  alerts: readonly Alert[];
  hasRecord: boolean;
  className?: string;
}) {
  /*
   * An unrecorded day is worth saying, and the "Production is normal"
   * placeholder is dropped when it applies -- claiming all is well beside a
   * prompt to record the day reads as a contradiction.
   */
  const nudge: Alert | null = hasRecord
    ? null
    : { level: "warn", message: "Today isn't recorded yet." };

  const real = nudge ? alerts.filter((alert) => alert.level !== "good") : [...alerts];

  /*
   * Severity decides the headline, including against the nudge. A flock
   * losing birds outranks a missing entry, and leading with the entry would
   * bury the worse news one line further down. Sorting is stable, so the
   * nudge still leads among equals.
   */
  const items = (nudge ? [nudge, ...real] : real).sort(
    (a, b) => SEVERITY[a.level] - SEVERITY[b.level]
  );

  if (items.length === 0) return null;

  const [primary, ...rest] = items;
  const tone = TONE[primary.level];
  const Icon = ICONS[primary.level];

  const detail =
    primary === nudge
      ? "Take 30 seconds to log this morning's collection."
      : rest.length > 0
        ? `${rest.length} more ${rest.length === 1 ? "thing" : "things"} to look at.`
        : primary.level === "good"
          ? "Nothing unusual across production, feed and mortality."
          : // Never claim all is well under a warning -- say what is true
            // instead: this is the only thing asking for attention.
            "Nothing else needs your attention.";

  return (
    <section
      aria-label="Today's status"
      id="todays-status"
      role={primary.level === "bad" ? "alert" : "status"}
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface shadow-card",
        className
      )}
    >
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 p-4", tone.wash)}>
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-lg",
            tone.chip
          )}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>

        {/* basis-64 is what makes the wrap happen: below ~256px of room the
            pill drops to its own line instead of crushing the headline into
            four. Tested at 375. */}
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-base font-semibold tracking-tight">{primary.message}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
        </div>

        {/* Icon and words, not colour alone -- the dot is reinforcement. */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium",
            tone.chip
          )}
        >
          <span className="relative flex size-2">
            {primary.level !== "good" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
            )}
            <span className="relative inline-flex size-2 rounded-full bg-current" />
          </span>
          {tone.label}
        </span>
      </div>

      {rest.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {rest.map((alert, index) => {
            const restTone = TONE[alert.level];
            const RestIcon = ICONS[alert.level];
            return (
              <li
                key={`${alert.level}-${index}`}
                className="flex items-start gap-2.5 px-4 py-2.5 text-sm"
              >
                <RestIcon
                  className={cn("mt-0.5 size-4 shrink-0", restTone.text)}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">{alert.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
