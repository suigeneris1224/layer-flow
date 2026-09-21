import { describe, expect, it } from "vitest";
import { mergePaymentHistory } from "@/lib/domain/payment-history";
import type { ManualPaymentHistoryRow } from "@/lib/data/manual-payments";
import type { PaymongoPaymentHistoryRow } from "@/lib/data/paymongo-payments";

const manualRow: ManualPaymentHistoryRow = {
  id: "manual-1",
  ownerId: "owner-1",
  plan: "STARTER",
  billingPeriod: "MONTHLY",
  amountCentavos: 34_900,
  payerName: "Santos Farm",
  referenceNumber: "REF123",
  status: "APPROVED",
  createdAt: "2026-09-10T00:00:00.000Z",
  ownerEmail: "santos@example.com",
  farmName: "Santos Farm",
  paymentNote: "LF-ABC123",
  reviewedAt: "2026-09-11T00:00:00.000Z",
};

const paymongoRow: PaymongoPaymentHistoryRow = {
  id: "paymongo-1",
  ownerId: "owner-2",
  ownerEmail: "cruz@example.com",
  farmName: "Cruz Layers",
  plan: "PRO",
  billingPeriod: "ANNUAL",
  amountCentavos: 899_000,
  status: "PAID",
  createdAt: "2026-09-15T00:00:00.000Z",
  paidAt: "2026-09-15T00:05:00.000Z",
};

describe("mergePaymentHistory", () => {
  it("sorts both sources together, newest first", () => {
    const merged = mergePaymentHistory([manualRow], [paymongoRow]);
    expect(merged.map((row) => row.id)).toEqual(["paymongo-1", "manual-1"]);
  });

  it("maps manual-only fields (payer name, reference, note) and settledAt from reviewedAt", () => {
    const [manual] = mergePaymentHistory([manualRow], []);
    expect(manual.source).toBe("manual");
    expect(manual.payerName).toBe("Santos Farm");
    expect(manual.referenceNumber).toBe("REF123");
    expect(manual.paymentNote).toBe("LF-ABC123");
    expect(manual.settledAt).toBe("2026-09-11T00:00:00.000Z");
  });

  it("leaves manual-only fields null for a paymongo row, and maps settledAt from paidAt", () => {
    const [paymongo] = mergePaymentHistory([], [paymongoRow]);
    expect(paymongo.source).toBe("paymongo");
    expect(paymongo.payerName).toBeNull();
    expect(paymongo.referenceNumber).toBeNull();
    expect(paymongo.paymentNote).toBeNull();
    expect(paymongo.settledAt).toBe("2026-09-15T00:05:00.000Z");
  });

  it("returns an empty array when both sources are empty", () => {
    expect(mergePaymentHistory([], [])).toEqual([]);
  });
});
