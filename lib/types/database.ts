/**
 * Database types.
 *
 * `database.generated.ts` is produced from the live schema and is the source of
 * truth. Regenerate it whenever you add a migration:
 *
 *   npm run db:types
 *
 * This module exists so the rest of the codebase imports friendly names
 * (`FarmRow`, `FarmRole`) rather than reaching into the generated file's shape.
 * Nothing here restates the schema, so the two cannot drift apart.
 */

import type { Database, Json } from "./database.generated";

export type { Database, Json };

type Public = Database["public"];
type TableRow<T extends keyof Public["Tables"]> = Public["Tables"][T]["Row"];
type ViewRow<T extends keyof Public["Views"]> = Public["Views"][T]["Row"];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type FarmRole = Public["Enums"]["farm_role"];
export type FlockStatus = Public["Enums"]["flock_status"];
export type PaymentStatus = Public["Enums"]["payment_status"];
export type ExpenseCategory = Public["Enums"]["expense_category"];
export type SubscriptionPlan = Public["Enums"]["subscription_plan"];
export type SubscriptionStatus = Public["Enums"]["subscription_status"];

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export type ProfileRow = TableRow<"profiles">;
export type FarmRow = TableRow<"farms">;
export type FarmMemberRow = TableRow<"farm_members">;
export type FarmInvitationRow = TableRow<"farm_invitations">;
export type HouseRow = TableRow<"houses">;
export type FlockRow = TableRow<"flocks">;
export type EggSizeRow = TableRow<"egg_sizes">;
export type EggPriceRow = TableRow<"egg_prices">;
export type DailyProductionRow = TableRow<"daily_production">;
export type DailyEggSizeProductionRow = TableRow<"daily_egg_size_production">;
export type FeedUsageRow = TableRow<"feed_usage">;
export type MortalityRecordRow = TableRow<"mortality_records">;
export type VaccinationRow = TableRow<"vaccinations">;
export type CustomerRow = TableRow<"customers">;
export type EggSaleRow = TableRow<"egg_sales">;
export type EggSaleItemRow = TableRow<"egg_sale_items">;
export type EggInventoryAdjustmentRow = TableRow<"egg_inventory_adjustments">;
export type ExpenseRow = TableRow<"expenses">;
export type SubscriptionRow = TableRow<"subscriptions">;
export type AuditLogRow = TableRow<"audit_logs">;

/** View: produced + adjusted - sold, per farm per egg size. */
export type EggInventoryBalanceRow = ViewRow<"egg_inventory_balances">;

// ---------------------------------------------------------------------------
// Insert helpers, for code that builds rows before writing them
// ---------------------------------------------------------------------------

export type Insert<T extends keyof Public["Tables"]> = Public["Tables"][T]["Insert"];
export type Update<T extends keyof Public["Tables"]> = Public["Tables"][T]["Update"];
