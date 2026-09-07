import { describe, expect, it } from "vitest";
import {
  PLANS,
  annualSavingsPercent,
  describeLimit,
  formatPlanPrice,
  priceCentavosFor,
} from "@/lib/subscriptions/plans";

describe("priceCentavosFor", () => {
  it("returns the monthly price by default shape", () => {
    expect(priceCentavosFor(PLANS.STARTER, "MONTHLY")).toBe(34_900);
  });

  it("returns the annual price when asked", () => {
    expect(priceCentavosFor(PLANS.STARTER, "ANNUAL")).toBe(349_000);
  });
});

describe("formatPlanPrice", () => {
  it("formats the monthly price by default", () => {
    expect(formatPlanPrice(PLANS.PRO)).toBe("₱899");
  });

  it("formats the annual price when asked", () => {
    expect(formatPlanPrice(PLANS.PRO, "ANNUAL")).toBe("₱8,990");
  });

  it("always shows ₱0 for Free, on either period", () => {
    expect(formatPlanPrice(PLANS.FREE, "MONTHLY")).toBe("₱0");
    expect(formatPlanPrice(PLANS.FREE, "ANNUAL")).toBe("₱0");
  });
});

describe("annualSavingsPercent", () => {
  it("is null for Free, which has no annual discount", () => {
    expect(annualSavingsPercent(PLANS.FREE)).toBeNull();
  });

  it("reports roughly 17% off for Starter and Pro", () => {
    expect(annualSavingsPercent(PLANS.STARTER)).toBe(17);
    expect(annualSavingsPercent(PLANS.PRO)).toBe(17);
  });

  it("is null when the annual price is not actually cheaper", () => {
    const noDiscount = { ...PLANS.STARTER, priceCentavosAnnual: PLANS.STARTER.priceCentavosMonthly * 12 };
    expect(annualSavingsPercent(noDiscount)).toBeNull();
  });
});

describe("describeLimit", () => {
  it("reports unlimited for a null limit", () => {
    expect(describeLimit("farms", null)).toBe("Unlimited");
  });

  it("appends 'days' for history_days", () => {
    expect(describeLimit("history_days", 30)).toBe("30 days");
  });

  it("shows an em dash for a zero limit", () => {
    expect(describeLimit("customers", 0)).toBe("—");
  });

  it("shows a plain count otherwise", () => {
    expect(describeLimit("houses", 3)).toBe("3");
  });
});
