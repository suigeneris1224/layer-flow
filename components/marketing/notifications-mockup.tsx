import { AlertCircle, Bell, TriangleAlert } from "lucide-react";

const ROWS = [
  {
    icon: TriangleAlert,
    tone: "warn" as const,
    message: "Only 3 trays left in stock.",
    when: "2h ago",
  },
  {
    icon: AlertCircle,
    tone: "bad" as const,
    message: "Mortality is higher than your normal range (6 today).",
    when: "Yesterday",
  },
  {
    icon: Bell,
    tone: "good" as const,
    message: "Production is normal.",
    when: "Today",
  },
];

const TONE: Record<"good" | "warn" | "bad", { chip: string; text: string }> = {
  good: { chip: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
  warn: { chip: "bg-warn/20 text-warn", text: "text-warn" },
  bad: { chip: "bg-bad/20 text-bad", text: "text-bad" },
};

/**
 * The notifications list, recreating NotificationRow's tone chips. A coded
 * recreation, not a screenshot -- see dashboard-mockup.tsx for why.
 */
export function NotificationsMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {ROWS.map((row) => (
          <li key={row.message} className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4">
            <span
              className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ${TONE[row.tone].chip}`}
              aria-hidden
            >
              <row.icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] sm:text-xs">{row.message}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{row.when}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
