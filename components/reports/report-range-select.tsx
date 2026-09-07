"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";
import type { RangeOption } from "@/lib/domain/reports";

/**
 * Single date-range dropdown for Analytics/Reports.
 *
 * Replaces the chip-plus-select picker (components/reports/range-picker.tsx,
 * still used by Expense categories) with one control: Today, This week, This
 * month, This year, then every full calendar year the farm has history for.
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
      <option value="day">Today</option>
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
