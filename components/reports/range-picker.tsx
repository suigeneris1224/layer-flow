"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";
import type { RangeOption } from "@/lib/domain/reports";
import { cn } from "@/lib/utils";

/**
 * Date-range picker for Analytics/Reports/Categories.
 *
 * The ranges a farmer actually reaches for are chips -- one tap, and you can
 * see what is selected without opening anything. Everything else (last 90
 * days, any of the last 24 months, any of the last 5 years) lives behind one
 * select.
 *
 * This used to be a single select holding all 34 options, which on a phone is
 * a very long picker wheel to spin for "this month". Splitting it keeps the
 * common case instant and the long tail reachable.
 *
 * Chips are links, not buttons: the range lives in the URL and the page is
 * server-rendered from it, so a real navigation is both simpler and
 * shareable. Only the select needs client JS.
 */

/** The four that cover almost every visit. `null` is the default range. */
const QUICK: { value: string | null; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: null, label: "Last 30 days" },
  { value: "year", label: "This year" },
];

const DEFAULT_RANGE = "30";

export function RangePicker({
  basePath,
  value,
  months,
  years,
}: {
  basePath: Route;
  value: string;
  months: RangeOption[];
  years: RangeOption[];
}) {
  const router = useRouter();

  const href = (range: string | null) =>
    (range === null ? basePath : `${basePath}?range=${range}`) as Route;

  const isQuick = QUICK.some((option) => (option.value ?? DEFAULT_RANGE) === value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((option) => {
          const active = (option.value ?? DEFAULT_RANGE) === value;
          return (
            <Link
              key={option.label}
              href={href(option.value)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md border px-3 text-xs transition-colors sm:text-sm md:min-h-0 md:py-1.5",
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

      <Select
        aria-label="Another date range"
        fit
        // Sits on the placeholder while a chip is active, so the two controls
        // never both look selected.
        value={isQuick ? "" : value}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) return;
          router.push(href(next === DEFAULT_RANGE ? null : next));
        }}
      >
        <option value="">More ranges…</option>
        <optgroup label="Quick ranges">
          <option value="90">Last 90 days</option>
        </optgroup>
        <optgroup label="Pick a month">
          {months.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Pick a year">
          {years.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}
