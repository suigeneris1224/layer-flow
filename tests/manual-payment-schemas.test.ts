import { describe, expect, it } from "vitest";
import { manualPaymentRejectSchema, manualPaymentSubmitSchema } from "@/lib/validation/schemas";

describe("manualPaymentSubmitSchema", () => {
  const base = {
    payerName: "Sunrise Layers",
    referenceNumber: "GC-123456789",
    plan: "PRO",
    billingPeriod: "MONTHLY",
  };

  it("accepts a valid submission", () => {
    expect(manualPaymentSubmitSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty payer name or reference number", () => {
    expect(manualPaymentSubmitSchema.safeParse({ ...base, payerName: "" }).success).toBe(false);
    expect(
      manualPaymentSubmitSchema.safeParse({ ...base, referenceNumber: "" }).success
    ).toBe(false);
  });

  it("rejects FREE -- there is nothing to pay for on the free plan", () => {
    const result = manualPaymentSubmitSchema.safeParse({ ...base, plan: "FREE" });
    expect(result.success).toBe(false);
  });

  it("rejects a plan or billing period outside the known set", () => {
    expect(manualPaymentSubmitSchema.safeParse({ ...base, plan: "ENTERPRISE" }).success).toBe(
      false
    );
    expect(
      manualPaymentSubmitSchema.safeParse({ ...base, billingPeriod: "WEEKLY" }).success
    ).toBe(false);
  });

  it("trims the payer name and reference number", () => {
    const result = manualPaymentSubmitSchema.safeParse({
      ...base,
      payerName: "  Sunrise Layers  ",
      referenceNumber: "  GC-123456789  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payerName).toBe("Sunrise Layers");
      expect(result.data.referenceNumber).toBe("GC-123456789");
    }
  });
});

describe("manualPaymentRejectSchema", () => {
  it("accepts an empty payload, defaulting reason to an empty string", () => {
    const result = manualPaymentRejectSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reason).toBe("");
  });

  it("accepts a reason", () => {
    const result = manualPaymentRejectSchema.safeParse({ reason: "Reference number not found" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reason).toBe("Reference number not found");
  });

  it("rejects a reason over 500 characters", () => {
    const result = manualPaymentRejectSchema.safeParse({ reason: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});
