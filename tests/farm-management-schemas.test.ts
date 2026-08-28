import { describe, expect, it } from "vitest";
import {
  retireFlockSchema,
  updateFarmSchema,
  updateFlockSchema,
  updateHouseSchema,
} from "@/lib/validation/schemas";

/**
 * Farms / houses / flocks management schemas.
 *
 * The one regression that matters most here: `updateFlockSchema` must never
 * accept `currentHens`. It is recalculated by a database trigger from
 * mortality_records, and a form that could pass it through would silently
 * fight that trigger.
 */

describe("updateFarmSchema", () => {
  it("rejects an empty name", () => {
    const result = updateFarmSchema.safeParse({
      name: "",
      municipality: "San Remigio",
      province: "Cebu",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid farm with an optional barangay left out", () => {
    const result = updateFarmSchema.safeParse({
      name: "Sunrise Farm",
      municipality: "San Remigio",
      province: "Cebu",
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = updateFarmSchema.safeParse({
      name: "  Sunrise Farm  ",
      municipality: " San Remigio ",
      province: " Cebu ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sunrise Farm");
    }
  });
});

describe("updateHouseSchema", () => {
  it("rejects a zero or negative capacity", () => {
    expect(updateHouseSchema.safeParse({ name: "House A", capacity: 0 }).success).toBe(false);
    expect(updateHouseSchema.safeParse({ name: "House A", capacity: -5 }).success).toBe(false);
  });

  it("accepts valid notes and defaults them when absent", () => {
    const withNotes = updateHouseSchema.safeParse({
      name: "House A",
      capacity: 500,
      notes: "Near the well",
    });
    expect(withNotes.success).toBe(true);

    const withoutNotes = updateHouseSchema.safeParse({ name: "House A", capacity: 500 });
    expect(withoutNotes.success).toBe(true);
    if (withoutNotes.success) expect(withoutNotes.data.notes).toBe("");
  });

  it("enforces the same name length limit as createHouseSchema", () => {
    const result = updateHouseSchema.safeParse({ name: "x".repeat(121), capacity: 100 });
    expect(result.success).toBe(false);
  });
});

describe("updateFlockSchema", () => {
  const base = {
    name: "Flock #002",
    houseId: "11111111-1111-1111-1111-111111111111",
    placementDate: "2025-01-01",
  };

  it("accepts a valid edit with no laying date yet", () => {
    expect(updateFlockSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a laying date before the placement date", () => {
    const result = updateFlockSchema.safeParse({
      ...base,
      startLayingDate: "2024-12-01",
    });
    expect(result.success).toBe(false);
  });

  it("drops currentHens and initialHens rather than passing them through", () => {
    const result = updateFlockSchema.safeParse({
      ...base,
      currentHens: 999,
      initialHens: 999,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("currentHens");
      expect(result.data).not.toHaveProperty("initialHens");
    }
  });
});

describe("retireFlockSchema", () => {
  it("accepts SOLD and CLOSED", () => {
    expect(retireFlockSchema.safeParse({ status: "SOLD" }).success).toBe(true);
    expect(retireFlockSchema.safeParse({ status: "CLOSED" }).success).toBe(true);
  });

  it("rejects an active status or garbage", () => {
    expect(retireFlockSchema.safeParse({ status: "GROWING" }).success).toBe(false);
    expect(retireFlockSchema.safeParse({ status: "PRODUCING" }).success).toBe(false);
    expect(retireFlockSchema.safeParse({ status: "nope" }).success).toBe(false);
  });

  it("defaults notes to an empty string", () => {
    const result = retireFlockSchema.safeParse({ status: "SOLD" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe("");
  });
});
