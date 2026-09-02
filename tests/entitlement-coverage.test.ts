import { describe, expect, it } from "vitest";
import { FEATURE_LABELS, PLANS, type Feature, type LimitKey } from "@/lib/subscriptions/plans";

/**
 * Every plan feature must be a deliberate decision.
 *
 * The pricing page sells seventeen features. Before this test, six of them were
 * never checked anywhere in the code -- `alerts` was sold as a Starter feature
 * and Free users had it. That drift was invisible because nothing connected the
 * plan table to the call sites.
 *
 * So: each feature belongs to exactly one of the two lists below. Adding a
 * feature to plans.ts without deciding which one fails this suite, which is the
 * point. NOT_YET_BUILT is not a loophole -- it is a promise the pricing page is
 * currently making that the code does not keep, and it should shrink over time.
 */

/** Enforced by a `canAccess`/`assertCanAccess` call, or by a limit. */
const ENFORCED: Record<Feature, string> = {
  egg_sales: "lib/data/reports.ts + lib/data/dashboard.ts — sales tracking",
  customers: "app/(app)/customers/{page,actions}.ts",
  full_expenses: "app/(app)/expenses/page.tsx",
  production_charts: "app/(app)/analytics/page.tsx",
  flock_comparison: "lib/data/analytics.ts",
  reports: "app/(app)/reports/page.tsx",
  advanced_reports: "lib/data/reports.ts — profitability by flock",
  alerts: "lib/data/dashboard.ts — the dashboard feed and lib/data/notifications.ts",
  advanced_alerts:
    "lib/data/dashboard.ts — buildAlerts()'s egg-size/inventory/flock/pricing rules and threshold overrides; app/(app)/settings/alerts/{page,actions}.ts — per-farm threshold configuration",
  data_export: "app/api/export/{sales,expenses}/route.ts — assertCanAccess before any row is read",
  team_management: "app/(app)/team/{page,actions}.ts",
  multi_farm: "enforced indirectly by the `farms` limit in farms/actions.ts",
  offline_mode:
    "app/(app)/production/new/page.tsx + app/(app)/health/page.tsx — canAccess gates whether the offline queue (lib/offline/) is used at all",
} as Record<Feature, string>;

/**
 * Sold on the pricing page, no implementing code yet.
 *
 * `profitability` and `egg_size_analytics` are a different case from the rest:
 * they are Starter features that Free users can see today. Gating them would
 * take something away from existing users, which is a product decision and not
 * one to make as a side effect of an audit. They stay here until that call is
 * made deliberately.
 */
const NOT_YET_BUILT: Partial<Record<Feature, string>> = {
  cross_farm_reporting: "Every data function takes a single farmId.",
  priority_support: "Not a software feature; nothing to gate.",
  profitability: "Ungated on Free today. Gating it is a deliberate product call.",
  egg_size_analytics: "Ungated on Free today. Gating it is a deliberate product call.",
};

const ALL_FEATURES = [...new Set(Object.values(PLANS).flatMap((plan) => plan.features))];

describe("entitlement coverage", () => {
  it("accounts for every feature exactly once", () => {
    const unaccounted = ALL_FEATURES.filter(
      (feature) => !(feature in ENFORCED) && !(feature in NOT_YET_BUILT)
    );

    expect(
      unaccounted,
      `Add these to ENFORCED or NOT_YET_BUILT in this test: ${unaccounted.join(", ")}`
    ).toEqual([]);
  });

  it("never lists a feature as both enforced and unbuilt", () => {
    const both = ALL_FEATURES.filter(
      (feature) => feature in ENFORCED && feature in NOT_YET_BUILT
    );
    expect(both).toEqual([]);
  });

  it("does not describe a feature that no plan actually sells", () => {
    const described = [...Object.keys(ENFORCED), ...Object.keys(NOT_YET_BUILT)];
    const orphans = described.filter(
      (feature) => !ALL_FEATURES.includes(feature as Feature)
    );
    expect(orphans).toEqual([]);
  });
});

/**
 * Limits get the same treatment. `users` was the one that mattered here: the
 * cap existed in the plan table and on the pricing page, and nothing enforced
 * it, because team management had no code at all.
 */
const ENFORCED_LIMITS: Record<LimitKey, string> = {
  farms: "app/(app)/farms/actions.ts — createFarmAction",
  houses: "app/(app)/houses/actions.ts",
  active_flocks: "app/(app)/flocks/actions.ts",
  customers: "app/(app)/customers/actions.ts",
  users: "app/(app)/team/actions.ts — inviteMemberAction, incl. pending invites",
  history_days: "app/(app)/production/page.tsx — via historyCutoffDate",
};

/*
 * The label is part of the promise.
 *
 * data_export shipped as "CSV, Excel and PDF export" while nothing generated
 * anything at all. Now that CSV is real, this keeps the other two from
 * drifting back into the pricing page ahead of the code.
 */
describe("feature labels", () => {
  it("promises only the export format that exists", () => {
    expect(FEATURE_LABELS.data_export).toMatch(/csv/i);
    expect(FEATURE_LABELS.data_export).not.toMatch(/excel|pdf/i);
  });
});

describe("limit coverage", () => {
  it("accounts for every limit key", () => {
    const keys = Object.keys(PLANS.FREE.limits) as LimitKey[];
    const unaccounted = keys.filter((key) => !(key in ENFORCED_LIMITS));

    expect(
      unaccounted,
      `Every LimitKey needs an enforcement site: ${unaccounted.join(", ")}`
    ).toEqual([]);
  });
});
