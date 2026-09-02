import { describe, expect, it } from "vitest";
import {
  SUBSCRIPTION_REMINDER_DAYS,
  buildPastDueReminderEmail,
  buildReceiptEmail,
  buildRenewalReminderEmail,
  type SubscriptionEmailContext,
} from "@/lib/email/templates";
import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";

function ctx(overrides: Partial<SubscriptionEmailContext> = {}): SubscriptionEmailContext {
  return {
    farmName: "Sunrise Layers",
    plan: "PRO",
    status: "ACTIVE",
    currentPeriodEnd: "2026-09-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildReceiptEmail", () => {
  it("includes the farm name, plan price and status", () => {
    const email = buildReceiptEmail(ctx());
    expect(email.text).toContain("Sunrise Layers");
    expect(email.text).toContain(formatPlanPrice(PLANS.PRO));
    expect(email.text).toContain("ACTIVE");
    expect(email.html).toContain("Sunrise Layers");
  });

  it("says it is not an official tax invoice", () => {
    const email = buildReceiptEmail(ctx());
    expect(email.text).toContain("not an official tax invoice");
  });

  it("shows a renewal date when one is set", () => {
    const email = buildReceiptEmail(ctx({ currentPeriodEnd: "2026-09-15T00:00:00.000Z" }));
    expect(email.text).toContain("Renews on");
  });

  it("says the renewal date is not yet set when null", () => {
    const email = buildReceiptEmail(ctx({ currentPeriodEnd: null }));
    expect(email.text).toContain("Renewal date not yet set");
    expect(email.text).not.toContain("Renews on");
  });
});

describe("buildPastDueReminderEmail", () => {
  it("mentions the farm name and plan", () => {
    const email = buildPastDueReminderEmail(ctx({ status: "PAST_DUE" }));
    expect(email.subject).toContain("Sunrise Layers");
    expect(email.text).toContain(formatPlanPrice(PLANS.PRO));
  });

  it("never claims access has been cut off", () => {
    const email = buildPastDueReminderEmail(ctx({ status: "PAST_DUE" }));
    for (const word of ["suspended", "locked out", "disabled", "cancelled your"]) {
      expect(email.text.toLowerCase()).not.toContain(word);
    }
    expect(email.text).toContain("keeps full access");
  });
});

describe("buildRenewalReminderEmail", () => {
  it("includes the correct day count", () => {
    const email = buildRenewalReminderEmail(ctx(), SUBSCRIPTION_REMINDER_DAYS);
    expect(email.subject).toContain(`${SUBSCRIPTION_REMINDER_DAYS} days`);
    expect(email.text).toContain(`renews in ${SUBSCRIPTION_REMINDER_DAYS} days`);
  });

  it("uses singular phrasing for one day", () => {
    const email = buildRenewalReminderEmail(ctx(), 1);
    expect(email.subject).toContain("1 day");
    expect(email.subject).not.toContain("1 days");
  });
});
