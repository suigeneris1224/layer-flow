import { describe, expect, it } from "vitest";
import { findSameDayEntries, type SameDayRecord } from "@/lib/domain/health";

function record(overrides: Partial<SameDayRecord> = {}): SameDayRecord {
  return {
    id: "rec-1",
    flockId: "flock-1",
    date: "2026-09-30",
    recordedByName: "Juan",
    ...overrides,
  };
}

describe("findSameDayEntries", () => {
  it("returns entries matching the same flock and date", () => {
    const records = [record({ id: "rec-1" }), record({ id: "rec-2" })];
    expect(findSameDayEntries(records, "flock-1", "2026-09-30")).toHaveLength(2);
  });

  it("excludes entries for a different flock", () => {
    const records = [record({ flockId: "flock-2" })];
    expect(findSameDayEntries(records, "flock-1", "2026-09-30")).toHaveLength(0);
  });

  it("excludes entries for a different date", () => {
    const records = [record({ date: "2026-09-29" })];
    expect(findSameDayEntries(records, "flock-1", "2026-09-30")).toHaveLength(0);
  });

  it("excludes the record currently being edited", () => {
    const records = [record({ id: "rec-1" }), record({ id: "rec-2" })];
    expect(findSameDayEntries(records, "flock-1", "2026-09-30", "rec-1")).toEqual([
      record({ id: "rec-2" }),
    ]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(findSameDayEntries([], "flock-1", "2026-09-30")).toEqual([]);
  });
});
