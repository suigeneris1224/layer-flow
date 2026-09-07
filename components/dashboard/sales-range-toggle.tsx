"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";
import type { SalesOverviewRange } from "@/lib/data/sales-overview";

const OPTIONS: { value: SalesOverviewRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

/**
 * "This week" / "This month" / "This year" for the dashboard's Sales overview panel.
 *
 * A single select rather than a chip pair: this panel only ever needs one of
 * two ranges, so a dropdown keeps the panel header from feeling crowded next
 * to the info tip. The range still lives in the URL, matching RangePicker
 * (components/reports/range-picker.tsx).
 */
export function SalesRangeToggle({ value }: { value: SalesOverviewRange }) {
  const router = useRouter();

  return (
    <Select
      aria-label="Sales overview range"
      fit
      value={value}
      onChange={(event) => {
        router.push(`/dashboard?salesRange=${event.target.value}` as Route);
      }}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
