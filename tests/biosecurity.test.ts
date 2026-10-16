import { describe, expect, it } from "vitest";
import { daysSinceLastCheck, recentPoultryContactDays } from "@/lib/domain/biosecurity";

describe("daysSinceLastCheck", () => {
  const checks = [
    { checkType: "FOOTBATH" as const, checkDate: "2026-10-01" },
    { checkType: "FOOTBATH" as const, checkDate: "2026-10-10" },
    { checkType: "PEST_CONTROL" as const, checkDate: "2026-09-01" },
  ];

  it("counts from the most recent check of that type", () => {
    expect(daysSinceLastCheck(checks, "FOOTBATH", "2026-10-16")).toBe(6);
    expect(daysSinceLastCheck(checks, "PEST_CONTROL", "2026-10-16")).toBe(45);
  });

  it("is null for a type never logged", () => {
    expect(daysSinceLastCheck(checks, "CLEANING", "2026-10-16")).toBeNull();
  });

  it("never goes negative for a future-dated row", () => {
    expect(daysSinceLastCheck(checks, "FOOTBATH", "2026-10-05")).toBe(0);
  });
});

describe("recentPoultryContactDays", () => {
  it("reports contact within three days of the visit", () => {
    expect(recentPoultryContactDays("2026-10-14", "2026-10-16")).toBe(2);
    expect(recentPoultryContactDays("2026-10-16", "2026-10-16")).toBe(0);
  });

  it("is null when unknown, older, or after the visit", () => {
    expect(recentPoultryContactDays(null, "2026-10-16")).toBeNull();
    expect(recentPoultryContactDays("2026-10-10", "2026-10-16")).toBeNull();
    expect(recentPoultryContactDays("2026-10-17", "2026-10-16")).toBeNull();
  });
});
