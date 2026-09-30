import { formatNumber } from "@/lib/format";

const LINES = [
  { name: "Small", eggs: 185, tone: "good" as const, width: 35 },
  { name: "Medium", eggs: 417, tone: "good" as const, width: 79 },
  { name: "Large", eggs: 92, tone: "warn" as const, width: 18 },
  { name: "Extra Large", eggs: 0, tone: "bad" as const, width: 2 },
];

const TONE_BAR: Record<"good" | "warn" | "bad", string> = {
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
};

const TONE_TEXT: Record<"good" | "warn" | "bad", string> = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

/**
 * Egg inventory by size, recreating InventoryPanel's tone-bar rows. A coded
 * recreation, not a screenshot -- see dashboard-mockup.tsx for why.
 */
export function InventoryMockup() {
  const total = LINES.reduce((sum, line) => sum + line.eggs, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {LINES.map((line) => (
          <div key={line.name} className="flex items-center gap-3">
            <span className="w-16 shrink-0 truncate text-[10px] sm:text-xs">{line.name}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span
                className={`block h-full rounded-full ${TONE_BAR[line.tone]}`}
                style={{ width: `${line.width}%` }}
              />
            </span>
            <span
              className={`w-10 shrink-0 text-right text-[10px] font-medium tabular sm:text-xs ${TONE_TEXT[line.tone]}`}
            >
              {formatNumber(line.eggs)}
            </span>
          </div>
        ))}

        <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3 text-[10px] sm:text-xs">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular">{formatNumber(total)} eggs</span>
        </div>
      </div>
    </div>
  );
}
