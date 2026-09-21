"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/field";

const OPTIONS = [
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

/** "This month" / "This year" / "All time" for /admin/payment-history -- same URL-as-state idiom as ExpensesRangeSelect. */
export function PaymentHistoryRangeSelect({ value }: { value: string }) {
  const router = useRouter();

  return (
    <Select
      aria-label="Date range"
      fit
      value={value}
      onChange={(event) => {
        router.push(`/admin/payment-history?range=${event.target.value}` as Route);
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
