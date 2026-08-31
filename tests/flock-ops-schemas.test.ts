import { describe, expect, it } from "vitest";
import {
  feedUsageSchema,
  mortalityRecordSchema,
  updateProfileSchema,
  vaccinationSchema,
} from "@/lib/validation/schemas";

/**
 * Standalone mortality / feed / vaccination entry, plus the profile editor.
 *
 * The rule worth guarding here is that none of these schemas has any notion of
 * `dailyProductionId`. Ad-hoc rows must always be written with that column
 * null, because record_daily_production deletes and re-inserts every row it
 * finds linked to the day it saves. A schema that could carry a link through
 * would let a farmer attach an incident to a day and lose it on the next save.
 */

const FLOCK = "6c2f4a5e-0f7a-4a1c-9a4a-0f8b7f3d1e22";

describe("mortalityRecordSchema", () => {
  it("accepts a minimal record", () => {
    const result = mortalityRecordSchema.safeParse({
      flockId: FLOCK,
      recordDate: "2026-08-31",
      quantity: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(3);
      expect(result.data.reason).toBe("");
    }
  });

  it("rejects a zero loss -- an incident with no birds is not an incident", () => {
    const result = mortalityRecordSchema.safeParse({
      flockId: FLOCK,
      recordDate: "2026-08-31",
      quantity: "0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative quantity", () => {
    const result = mortalityRecordSchema.safeParse({
      flockId: FLOCK,
      recordDate: "2026-08-31",
      quantity: "-2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = mortalityRecordSchema.safeParse({
      flockId: FLOCK,
      recordDate: "31/08/2026",
      quantity: "3",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid flock", () => {
    const result = mortalityRecordSchema.safeParse({
      flockId: "flock-1",
      recordDate: "2026-08-31",
      quantity: "3",
    });
    expect(result.success).toBe(false);
  });

  it("trims the reason and notes", () => {
    const result = mortalityRecordSchema.safeParse({
      flockId: FLOCK,
      recordDate: "2026-08-31",
      quantity: "3",
      reason: "  Heat stress  ",
      notes: "  Afternoon  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Heat stress");
      expect(result.data.notes).toBe("Afternoon");
    }
  });

  it("has no daily production link to smuggle a row onto a collection day", () => {
    const result = mortalityRecordSchema.safeParse({
      flockId: FLOCK,
      recordDate: "2026-08-31",
      quantity: "3",
      dailyProductionId: FLOCK,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("dailyProductionId");
    }
  });
});

describe("feedUsageSchema", () => {
  it("accepts decimal kilos and defaults the cost", () => {
    const result = feedUsageSchema.safeParse({
      flockId: FLOCK,
      usageDate: "2026-08-31",
      quantityKg: "42.5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantityKg).toBe(42.5);
      expect(result.data.costPerKg).toBe(0);
    }
  });

  it("allows a zero delivery so a correction can blank a day out", () => {
    const result = feedUsageSchema.safeParse({
      flockId: FLOCK,
      usageDate: "2026-08-31",
      quantityKg: "0",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative quantity", () => {
    const result = feedUsageSchema.safeParse({
      flockId: FLOCK,
      usageDate: "2026-08-31",
      quantityKg: "-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an implausible cost per kg", () => {
    const result = feedUsageSchema.safeParse({
      flockId: FLOCK,
      usageDate: "2026-08-31",
      quantityKg: "10",
      costPerKg: "99999",
    });
    expect(result.success).toBe(false);
  });

  it("rejects text in the quantity", () => {
    const result = feedUsageSchema.safeParse({
      flockId: FLOCK,
      usageDate: "2026-08-31",
      quantityKg: "one sack",
    });
    expect(result.success).toBe(false);
  });
});

describe("vaccinationSchema", () => {
  it("accepts a vaccination", () => {
    const result = vaccinationSchema.safeParse({
      flockId: FLOCK,
      vaccinationDate: "2026-08-31",
      vaccineName: "Newcastle disease",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank vaccine name, matching the database check", () => {
    const result = vaccinationSchema.safeParse({
      flockId: FLOCK,
      vaccinationDate: "2026-08-31",
      vaccineName: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("trims the vaccine name", () => {
    const result = vaccinationSchema.safeParse({
      flockId: FLOCK,
      vaccinationDate: "2026-08-31",
      vaccineName: "  NDV  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.vaccineName).toBe("NDV");
  });

  it("rejects a name longer than the column allows", () => {
    const result = vaccinationSchema.safeParse({
      flockId: FLOCK,
      vaccinationDate: "2026-08-31",
      vaccineName: "x".repeat(121),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts a name with the phone left out", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Ana Reyes" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("");
  });

  it("rejects an empty name", () => {
    const result = updateProfileSchema.safeParse({ fullName: "  " });
    expect(result.success).toBe(false);
  });

  it("keeps a phone number written however the farmer writes it", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "Ana Reyes",
      phone: " 0917 555 1234 ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("0917 555 1234");
  });
});
