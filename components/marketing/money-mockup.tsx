const ROWS = [
  { label: "Sale — Maria Santos", amount: "+₱2,100", tone: "good" as const },
  { label: "Sale — Walk-in", amount: "+₱840", tone: "good" as const },
  { label: "Expense — Feed (Layer mash)", amount: "−₱4,500", tone: "bad" as const },
];

const TONE_TEXT: Record<"good" | "bad", string> = {
  good: "text-good",
  bad: "text-bad",
};

/**
 * Sales and expenses as one running list. A coded recreation, not a
 * screenshot -- see dashboard-mockup.tsx for why.
 */
export function MoneyMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {ROWS.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
            <span className="min-w-0 flex-1 truncate text-[11px] sm:text-xs">{row.label}</span>
            <span className={`shrink-0 text-right text-[11px] font-semibold tabular sm:text-xs ${TONE_TEXT[row.tone]}`}>
              {row.amount}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between border-t border-border px-3 py-2.5 text-[10px] sm:px-4 sm:text-xs">
        <span className="text-muted-foreground">Net this week</span>
        <span className="font-semibold tabular">−₱1,560</span>
      </div>
    </div>
  );
}
