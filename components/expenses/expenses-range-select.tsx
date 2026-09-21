"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";
import type { ExpensesHistoryRangeValue } from "@/lib/data/expenses";

const OPTIONS: { value: ExpensesHistoryRangeValue; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

/**
 * "This week" / "This month" / "This year" / "All time" for the Expenses
 * list -- same single-select-in-the-URL shape as SalesRangeSelect
 * (components/sales/sales-range-select.tsx), including "All time" for the
 * same reason: a flat transaction list has an obvious, useful unbounded view.
 */
export function ExpensesRangeSelect({ value }: { value: ExpensesHistoryRangeValue }) {
  const router = useRouter();

  return (
    <Select
      aria-label="Date range"
      fit
      value={value}
      onChange={(event) => {
        router.push(`/expenses?range=${event.target.value}` as Route);
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
