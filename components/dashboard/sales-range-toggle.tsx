import Link from "next/link";
import type { Route } from "next";
import type { SalesOverviewRange } from "@/lib/data/sales-overview";
import { cn } from "@/lib/utils";

const OPTIONS: { value: SalesOverviewRange; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

/**
 * "This month" / "This year" for the dashboard's Sales overview panel.
 *
 * A plain server-rendered Link pair, same idiom as RangePicker
 * (components/reports/range-picker.tsx): the range lives in the URL, so no
 * client JS is needed just to switch it.
 */
export function SalesRangeToggle({ value }: { value: SalesOverviewRange }) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Link
            key={option.value}
            href={`/dashboard?salesRange=${option.value}` as Route}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs transition-colors",
              active
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "border-input bg-surface hover:border-foreground/30 hover:bg-muted"
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
