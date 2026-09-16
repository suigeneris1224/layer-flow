"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";
import type { SalesHistoryRangeValue } from "@/lib/data/sales";

const OPTIONS: { value: SalesHistoryRangeValue; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

/**
 * "This week" / "This month" / "This year" / "All time" for the Sales
 * History list.
 *
 * Same single-select-in-the-URL shape as ReportRangeSelect
 * (components/reports/report-range-select.tsx) and SalesRangeToggle
 * (components/dashboard/sales-range-toggle.tsx) -- "All time" is the one
 * option neither of those offer, since a flat transaction list (unlike a
 * chart) has an obvious, useful unbounded view.
 */
export function SalesRangeSelect({ value }: { value: SalesHistoryRangeValue }) {
  const router = useRouter();

  return (
    <Select
      aria-label="Date range"
      fit
      value={value}
      onChange={(event) => {
        router.push(`/sales?range=${event.target.value}` as Route);
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
