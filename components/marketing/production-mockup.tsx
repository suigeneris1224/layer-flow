const SIZES = [
  { label: "S", value: "40" },
  { label: "M", value: "120" },
  { label: "L", value: "380" },
  { label: "XL", value: "260" },
  { label: "J", value: "20" },
];

/**
 * The daily production form's key fields. A coded recreation, not a
 * screenshot -- see dashboard-mockup.tsx for why.
 */
export function ProductionMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
          <MockField label="Eggs collected" value="820" />
          <MockField label="Broken" value="6" />
          <MockField label="Dirty" value="4" />
        </div>

        <div>
          <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
            Breakdown by size
          </p>
          <div className="mt-1.5 flex gap-1.5">
            {SIZES.map((size) => (
              <div
                key={size.label}
                className="flex flex-1 flex-col items-center rounded-md border border-input bg-background py-1.5"
              >
                <span className="text-[9px] text-muted-foreground sm:text-[10px]">{size.label}</span>
                <span className="text-xs font-semibold tabular sm:text-sm">{size.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MockField label="Feed (kg)" value="115" />
          <MockField label="Mortality" value="2" />
        </div>

        <span className="mt-1 inline-flex h-8 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
          Save today&apos;s record
        </span>
      </div>
    </div>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground sm:text-xs">{label}</span>
      <div className="mt-1 flex h-8 items-center rounded-md border border-input bg-background px-2 text-xs font-medium tabular sm:text-sm">
        {value}
      </div>
    </div>
  );
}
