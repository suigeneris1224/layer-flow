import type { SubscriptionPlan } from "@/lib/types/database";

/**
 * Plan definitions -- the single place pricing, limits and entitlements live.
 *
 * Nothing else in the codebase should test `plan === "PRO"`. Ask
 * `canAccess()` / `canCreate()` in entitlements.ts instead, so adding a plan
 * or moving a feature is a one-file change.
 */

export type Feature =
  | "egg_sales"
  | "customers"
  | "full_expenses"
  | "profitability"
  | "production_charts"
  | "egg_size_analytics"
  | "alerts"
  | "advanced_alerts"
  | "reports"
  | "advanced_reports"
  | "flock_comparison"
  | "offline_mode"
  | "data_export"
  | "team_management"
  | "multi_farm"
  | "cross_farm_reporting"
  | "priority_support";

export type LimitKey =
  | "farms"
  | "houses"
  | "active_flocks"
  | "users"
  | "customers"
  | "history_days";

/** Limits are counts; `null` means unlimited. */
export type PlanLimits = Record<LimitKey, number | null>;

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  /** Monthly price in PHP centavos, to keep money off floating point. */
  priceCentavos: number;
  tagline: string;
  audience: string;
  highlight?: string;
  limits: PlanLimits;
  features: readonly Feature[];
}

const FREE_FEATURES: readonly Feature[] = [];

const STARTER_FEATURES: readonly Feature[] = [
  ...FREE_FEATURES,
  "egg_sales",
  "customers",
  "full_expenses",
  "profitability",
  "production_charts",
  "egg_size_analytics",
  "alerts",
  "reports",
  "offline_mode",
];

const PRO_FEATURES: readonly Feature[] = [
  ...STARTER_FEATURES,
  "advanced_alerts",
  "advanced_reports",
  "flock_comparison",
  "data_export",
  "team_management",
  "multi_farm",
  "cross_farm_reporting",
  "priority_support",
];

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceCentavos: 0,
    tagline: "Track your daily eggs, free forever.",
    audience: "A single small flock you want to start recording properly.",
    limits: {
      farms: 1,
      houses: 1,
      active_flocks: 1,
      users: 1,
      customers: 0,
      history_days: 30,
    },
    features: FREE_FEATURES,
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceCentavos: 19_900,
    tagline: "Sell eggs and see what you actually earn.",
    audience: "A working farm selling eggs and watching its costs.",
    highlight: "Most popular",
    limits: {
      farms: 1,
      houses: 3,
      active_flocks: 5,
      users: 2,
      customers: 20,
      history_days: null,
    },
    features: STARTER_FEATURES,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceCentavos: 49_900,
    tagline: "Run several farms with a team.",
    audience: "Multiple farms or houses, with staff recording data.",
    limits: {
      farms: 3,
      houses: null,
      active_flocks: null,
      users: 10,
      customers: null,
      history_days: null,
    },
    features: PRO_FEATURES,
  },
};

export const PLAN_ORDER: readonly SubscriptionPlan[] = ["FREE", "STARTER", "PRO"];

/** The cheapest plan that includes a feature, for upgrade prompts. */
export function requiredPlanFor(feature: Feature): SubscriptionPlan | null {
  return PLAN_ORDER.find((id) => PLANS[id].features.includes(feature)) ?? null;
}

/** The cheapest plan whose limit exceeds the current one. */
export function nextPlanForLimit(
  current: SubscriptionPlan,
  key: LimitKey
): SubscriptionPlan | null {
  const currentLimit = PLANS[current].limits[key];
  if (currentLimit === null) return null;

  return (
    PLAN_ORDER.find((id) => {
      const limit = PLANS[id].limits[key];
      return limit === null || limit > currentLimit;
    }) ?? null
  );
}

export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.priceCentavos === 0) return "₱0";
  return `₱${(plan.priceCentavos / 100).toLocaleString("en-PH")}`;
}

export const LIMIT_LABELS: Record<LimitKey, { singular: string; plural: string }> = {
  farms: { singular: "farm", plural: "farms" },
  houses: { singular: "house", plural: "houses" },
  active_flocks: { singular: "active flock", plural: "active flocks" },
  users: { singular: "user", plural: "users" },
  customers: { singular: "customer", plural: "customers" },
  history_days: { singular: "day of history", plural: "days of history" },
};

export const FEATURE_LABELS: Record<Feature, string> = {
  egg_sales: "Egg sales",
  customers: "Customer records",
  full_expenses: "Full expense tracking",
  profitability: "Profitability",
  production_charts: "Production charts",
  egg_size_analytics: "Egg size analytics",
  alerts: "Alerts",
  advanced_alerts: "Advanced alerts",
  reports: "Reports",
  advanced_reports: "Advanced reports",
  flock_comparison: "Flock comparison",
  offline_mode: "Offline mode",
  data_export: "CSV, Excel and PDF export",
  team_management: "Team management",
  multi_farm: "Multiple farms",
  cross_farm_reporting: "Cross-farm reporting",
  priority_support: "Priority support",
};
