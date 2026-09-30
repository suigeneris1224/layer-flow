import { describe, expect, it } from "vitest";
import { normalizePhMobile } from "@/lib/domain/phone";
import { WAITLIST_FLOCK_SIZES, flockSizeLabel } from "@/lib/domain/waitlist";
import { canStartTrial, isTrialOver } from "@/lib/subscriptions/trial";
import { waitlistJoinSchema } from "@/lib/validation/schemas";
import { buildWaitlistConfirmationEmail } from "@/lib/email/templates";
import { RATE_LIMITS } from "@/lib/domain/rate-limit";

describe("normalizePhMobile", () => {
  it.each([
    ["09171234567", "+639171234567"],
    ["0917 123 4567", "+639171234567"],
    ["0917-123-4567", "+639171234567"],
    ["9171234567", "+639171234567"],
    ["639171234567", "+639171234567"],
    ["+63 917 123 4567", "+639171234567"],
    ["+63.917.123.4567", "+639171234567"],
    ["(0917) 123 4567", "+639171234567"],
    ["  09171234567  ", "+639171234567"],
  ])("normalises %s", (raw, expected) => {
    expect(normalizePhMobile(raw)).toBe(expected);
  });

  it.each([
    "",
    "0917123456", // one digit short
    "091712345678", // one digit long
    "0281234567", // Manila landline
    "08171234567", // not a 9-prefixed mobile
    "+1 917 123 4567",
    "0917abc4567",
  ])("rejects %s", (raw) => {
    expect(normalizePhMobile(raw)).toBeNull();
  });
});

describe("waitlistJoinSchema", () => {
  const base = {
    plan: "STARTER",
    farmName: "San Remigio Egg Farm",
    mobileNumber: "0917 123 4567",
    flockSize: "FROM_500_TO_2000",
    consent: true,
  };

  it("accepts a valid entry and normalises the mobile", () => {
    const parsed = waitlistJoinSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.mobileNumber).toBe("+639171234567");
  });

  it("requires consent to be exactly true", () => {
    expect(waitlistJoinSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(waitlistJoinSchema.safeParse({ ...base, consent: "true" }).success).toBe(false);
  });

  it("rejects a bad mobile with a helpful message", () => {
    const parsed = waitlistJoinSchema.safeParse({ ...base, mobileNumber: "12345" });
    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.message).toMatch(/0917 123 4567/);
  });

  it("rejects FREE, unknown flock sizes and a blank farm name", () => {
    expect(waitlistJoinSchema.safeParse({ ...base, plan: "FREE" }).success).toBe(false);
    expect(waitlistJoinSchema.safeParse({ ...base, flockSize: "HUGE" }).success).toBe(false);
    expect(waitlistJoinSchema.safeParse({ ...base, farmName: "  " }).success).toBe(false);
  });
});

describe("flock sizes", () => {
  it("labels every bucket", () => {
    for (const option of WAITLIST_FLOCK_SIZES) {
      expect(flockSizeLabel(option.value)).toBe(option.label);
    }
  });
});

describe("isTrialOver", () => {
  const now = new Date("2026-10-01T00:00:00Z");

  it("is true only for a TRIALING row past its end", () => {
    expect(isTrialOver("TRIALING", "2026-09-30T23:59:59Z", now)).toBe(true);
    expect(isTrialOver("TRIALING", "2026-10-01T00:00:00Z", now)).toBe(true);
    expect(isTrialOver("TRIALING", "2026-10-02T00:00:00Z", now)).toBe(false);
  });

  it("never ends a paid plan or an open-ended trial", () => {
    expect(isTrialOver("ACTIVE", "2026-09-01T00:00:00Z", now)).toBe(false);
    expect(isTrialOver("PAST_DUE", "2026-09-01T00:00:00Z", now)).toBe(false);
    expect(isTrialOver("TRIALING", null, now)).toBe(false);
  });
});

describe("canStartTrial", () => {
  it("allows a first trial from Free or a lapsed plan", () => {
    expect(canStartTrial({ plan: "FREE", status: "ACTIVE" }, null)).toBe(true);
    expect(canStartTrial({ plan: "PRO", status: "CANCELED" }, null)).toBe(true);
    expect(canStartTrial({ plan: "STARTER", status: "EXPIRED" }, null)).toBe(true);
    expect(canStartTrial(null, null)).toBe(true);
  });

  it("never allows a second trial", () => {
    expect(canStartTrial({ plan: "FREE", status: "ACTIVE" }, "2026-08-01T00:00:00Z")).toBe(false);
  });

  it("never overwrites a paid, past-due or running plan", () => {
    expect(canStartTrial({ plan: "STARTER", status: "ACTIVE" }, null)).toBe(false);
    expect(canStartTrial({ plan: "PRO", status: "PAST_DUE" }, null)).toBe(false);
    expect(canStartTrial({ plan: "STARTER", status: "TRIALING" }, null)).toBe(false);
  });
});

describe("buildWaitlistConfirmationEmail", () => {
  it("states the trial end date and that nothing is charged", () => {
    const email = buildWaitlistConfirmationEmail({
      fullName: "Maria",
      planName: "Starter",
      trialEndsAt: "2026-10-30T00:00:00Z",
    });
    expect(email.subject).toBe("You're on the LayerFlow waitlist for Starter");
    expect(email.text).toMatch(/trial is on now/);
    expect(email.text).toMatch(/nothing is charged/);
    expect(email.text).toMatch(/No payment is needed today/);
  });

  it("without a trial, just promises the heads-up", () => {
    const email = buildWaitlistConfirmationEmail({ fullName: "Maria", planName: "Pro", trialEndsAt: null });
    expect(email.text).toMatch(/let you know as soon as Pro opens/);
    expect(email.text).not.toMatch(/trial/);
  });
});

describe("waitlist rate limit", () => {
  it("stays within the 24h prune window", () => {
    expect(RATE_LIMITS.waitlist_join.windowSeconds).toBeLessThanOrEqual(24 * 60 * 60);
  });
});
