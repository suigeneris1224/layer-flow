import { describe, expect, it } from "vitest";
import { renewalBanner } from "@/lib/subscriptions/renewal-status";

const NOW = new Date("2026-06-15T00:00:00Z");

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe("renewalBanner", () => {
  it("warns for PAST_DUE regardless of the period end date", () => {
    const result = renewalBanner(
      { plan: "STARTER", status: "PAST_DUE" },
      daysFromNow(20),
      NOW
    );
    expect(result?.tone).toBe("bad");
    expect(result?.message).toMatch(/didn't go through/);
  });

  it("warns for PAST_DUE even with no period end set", () => {
    const result = renewalBanner({ plan: "PRO", status: "PAST_DUE" }, null, NOW);
    expect(result?.tone).toBe("bad");
  });

  it("returns null for FREE plan", () => {
    expect(renewalBanner({ plan: "FREE", status: "ACTIVE" }, daysFromNow(1), NOW)).toBeNull();
  });

  it("returns null when the period end is far away", () => {
    expect(renewalBanner({ plan: "STARTER", status: "ACTIVE" }, daysFromNow(10), NOW)).toBeNull();
  });

  it("returns null for CANCELED or EXPIRED (handled by an upgrade prompt elsewhere)", () => {
    expect(renewalBanner({ plan: "STARTER", status: "CANCELED" }, daysFromNow(1), NOW)).toBeNull();
    expect(renewalBanner({ plan: "STARTER", status: "EXPIRED" }, daysFromNow(1), NOW)).toBeNull();
  });

  it("warns within the reminder window", () => {
    const result = renewalBanner({ plan: "PRO", status: "ACTIVE" }, daysFromNow(3), NOW);
    expect(result?.tone).toBe("warn");
    expect(result?.message).toMatch(/renews in 3 days/);
  });

  it("uses singular wording for exactly 1 day left", () => {
    const result = renewalBanner({ plan: "PRO", status: "TRIALING" }, daysFromNow(1), NOW);
    expect(result?.message).toMatch(/renews in 1 day\b/);
  });

  it("says 'renews today' for 0 days left", () => {
    const result = renewalBanner({ plan: "PRO", status: "ACTIVE" }, daysFromNow(0), NOW);
    expect(result?.message).toMatch(/renews today/);
  });

  it("escalates to bad tone once the period has already ended", () => {
    const result = renewalBanner({ plan: "STARTER", status: "ACTIVE" }, daysFromNow(-2), NOW);
    expect(result?.tone).toBe("bad");
    expect(result?.message).toMatch(/period ended/);
  });
});
