"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";
import type { RangeOption } from "@/lib/domain/reports";

const QUICK_RANGES: RangeOption[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "year", label: "This year" },
];

/**
 * Date-range picker for Analytics/Reports/Categories.
 *
 * A single grouped `<select>` rather than a row of buttons: there are too
 * many options now (5 quick ranges plus 24 months plus 5 years) for buttons
 * to stay usable, especially on a phone. Navigating on change keeps this a
 * plain server-rendered page underneath -- no client state beyond the choice
 * itself.
 */
export function RangeSelect({
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

  return (
    <Select
      aria-label="Date range"
      className="w-auto min-w-0"
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        router.push((next === "30" ? basePath : `${basePath}?range=${next}`) as Route);
      }}
    >
      <optgroup label="Quick ranges">
        {QUICK_RANGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
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
  );
}
