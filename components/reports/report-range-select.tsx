"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";
import type { RangeOption } from "@/lib/domain/reports";

/**
 * Single date-range dropdown for Analytics/Reports/Cross-farm/Expense categories.
 *
 * Replaces the older chip-plus-select picker (components/reports/range-picker.tsx)
 * with one control: This week, This month, This year, then every full calendar
 * year the farm has history for. "Today"
 * is deliberately left out for now -- a single day is rarely a useful window
 * for a trend chart or a profit comparison; resolveReportRange still accepts
 * `?range=day` if an old link points at one, this just isn't offered here.
 * The range still lives in the URL and the page is server-rendered from it,
 * so only the select needs client JS.
 */
export function ReportRangeSelect({
  basePath,
  value,
  years,
}: {
  basePath: Route;
  value: string;
  years: RangeOption[];
}) {
  const router = useRouter();

  return (
    <Select
      aria-label="Date range"
      fit
      value={value}
      onChange={(event) => {
        router.push(`${basePath}?range=${event.target.value}` as Route);
      }}
    >
      <option value="week">This week</option>
      <option value="month">This month</option>
      <option value="year">This year</option>
      {years.length > 0 && (
        <optgroup label="Past years">
          {years.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      )}
    </Select>
  );
}
