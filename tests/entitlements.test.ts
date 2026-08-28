import { describe, expect, it } from "vitest";
import {
  EntitlementError,
  assertCanCreate,
  canAccess,
  canCreate,
  effectivePlan,
  getPlanLimit,
  historyCutoffDate,
  limitReachedPrompt,
} from "@/lib/subscriptions/entitlements";
import { PLANS, nextPlanForLimit, requiredPlanFor } from "@/lib/subscriptions/plans";
import {
  canManageBilling,
  canManageSales,
  canManageUsers,
  canRecordProduction,
} from "@/lib/auth/permissions";
import type { FarmContext } from "@/lib/auth/session";

const free = { plan: "FREE", status: "ACTIVE" } as const;
const starter = { plan: "STARTER", status: "ACTIVE" } as const;
const pro = { plan: "PRO", status: "ACTIVE" } as const;

describe("plan limits", () => {
  it("caps Free at one active flock", () => {
    expect(getPlanLimit(free, "active_flocks")).toBe(1);
    expect(canCreate(free, "active_flocks", 0)).toBe(true);
    expect(canCreate(free, "active_flocks", 1)).toBe(false);
  });

  it("caps Starter at five active flocks", () => {
    expect(canCreate(starter, "active_flocks", 4)).toBe(true);
    expect(canCreate(starter, "active_flocks", 5)).toBe(false);
  });

  it("treats null as unlimited", () => {
    expect(getPlanLimit(pro, "active_flocks")).toBeNull();
    expect(canCreate(pro, "active_flocks", 9999)).toBe(true);
  });

  it("limits Free history to 30 days and Starter to none", () => {
    expect(getPlanLimit(free, "history_days")).toBe(30);
    expect(getPlanLimit(starter, "history_days")).toBeNull();
  });
});

describe("feature gating", () => {
  it("locks egg sales on Free and opens it on Starter", () => {
    expect(canAccess(free, "egg_sales")).toBe(false);
    expect(canAccess(starter, "egg_sales")).toBe(true);
  });

  it("keeps export and multi-farm on Pro only", () => {
    expect(canAccess(starter, "data_export")).toBe(false);
    expect(canAccess(starter, "multi_farm")).toBe(false);
    expect(canAccess(pro, "data_export")).toBe(true);
    expect(canAccess(pro, "multi_farm")).toBe(true);
  });

  it("names the cheapest plan that unlocks a feature", () => {
    expect(requiredPlanFor("egg_sales")).toBe("STARTER");
    expect(requiredPlanFor("flock_comparison")).toBe("PRO");
  });

  it("gives Pro a superset of Starter's features", () => {
    for (const feature of PLANS.STARTER.features) {
      expect(PLANS.PRO.features).toContain(feature);
    }
  });
});

describe("lapsed subscriptions", () => {
  it("falls back to Free when canceled or expired", () => {
    expect(effectivePlan("PRO", "CANCELED")).toBe("FREE");
    expect(effectivePlan("PRO", "EXPIRED")).toBe("FREE");
  });

  it("keeps access while past due, so a payment hiccup is not a lockout", () => {
    expect(effectivePlan("PRO", "PAST_DUE")).toBe("PRO");
    expect(canAccess({ plan: "PRO", status: "PAST_DUE" }, "data_export")).toBe(true);
  });

  it("keeps trialing users on their plan", () => {
    expect(effectivePlan("STARTER", "TRIALING")).toBe("STARTER");
  });

  it("applies Free's gating to a canceled Pro farm", () => {
    expect(canAccess({ plan: "PRO", status: "CANCELED" }, "egg_sales")).toBe(false);
  });
});

describe("upgrade prompts", () => {
  it("explains the Free flock limit and points at Starter", () => {
    const prompt = limitReachedPrompt(free, "active_flocks", 1);
    expect(prompt.title).toContain("1 active flock limit on Free");
    expect(prompt.message).toContain("Starter");
    expect(prompt.message).toContain("5");
    expect(prompt.suggestedPlan).toBe("STARTER");
  });

  it("suggests unlimited wording when the next plan has no cap", () => {
    const prompt = limitReachedPrompt(starter, "active_flocks", 5);
    expect(prompt.suggestedPlan).toBe("PRO");
    expect(prompt.message).toContain("unlimited");
  });

  it("has no upgrade to suggest beyond the top plan", () => {
    expect(nextPlanForLimit("PRO", "active_flocks")).toBeNull();
  });

  it("throws a farmer-readable error when a limit is exceeded", () => {
    expect(() => assertCanCreate(free, "active_flocks", 1)).toThrow(EntitlementError);
    expect(() => assertCanCreate(free, "active_flocks", 0)).not.toThrow();
  });
});

describe("history window", () => {
  it("cuts Free off at 30 days back", () => {
    const now = new Date("2025-08-31T00:00:00Z");
    expect(historyCutoffDate(free, now)?.toISOString().slice(0, 10)).toBe("2025-08-01");
  });

  it("imposes no cutoff on paid plans", () => {
    expect(historyCutoffDate(pro)).toBeNull();
  });
});

describe("role permissions", () => {
  const as = (role: FarmContext["role"]): FarmContext => ({
    farmId: "f", farmName: "Farm", currency: "PHP", timezone: "Asia/Manila",
    role, plan: "PRO", subscriptionStatus: "ACTIVE",
  });

  it("lets every member record production", () => {
    expect(canRecordProduction(as("WORKER"))).toBe(true);
    expect(canRecordProduction(as("MANAGER"))).toBe(true);
    expect(canRecordProduction(as("OWNER"))).toBe(true);
  });

  it("keeps sales away from workers", () => {
    expect(canManageSales(as("WORKER"))).toBe(false);
    expect(canManageSales(as("MANAGER"))).toBe(true);
  });

  it("reserves team and billing for owners", () => {
    expect(canManageUsers(as("MANAGER"))).toBe(false);
    expect(canManageUsers(as("OWNER"))).toBe(true);
    expect(canManageBilling(as("MANAGER"))).toBe(false);
    expect(canManageBilling(as("OWNER"))).toBe(true);
  });

  it("denies everything without a farm context", () => {
    expect(canRecordProduction(null)).toBe(false);
    expect(canManageSales(null)).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });
});
