import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/domain/expenses";
import { PLAN_ORDER } from "@/lib/subscriptions/plans";
import type { ExpenseCategory, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
  "CANCELED",
  "EXPIRED",
];

/**
 * Shared input schemas.
 *
 * Every server action parses its input through one of these. Client-side
 * validation uses the same schema, so the farmer sees the same rule twice
 * rather than two subtly different ones.
 */

/** Form fields arrive as strings; coerce and reject the junk. */
const intFromForm = (label: string, { min = 0, max = 10_000_000 } = {}) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} cannot be less than ${min}`)
    .max(max, `${label} looks too large — please check`);

const decimalFromForm = (label: string, { min = 0, max = 10_000_000 } = {}) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(min, `${label} cannot be less than ${min}`)
    .max(max, `${label} looks too large — please check`);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");

export const uuid = z.string().uuid("That item is no longer available");

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export const createFarmSchema = z.object({
  name: z.string().trim().min(1, "Enter your farm name").max(120),
  barangay: z.string().trim().max(120).optional().default(""),
  municipality: z.string().trim().min(1, "Enter your municipality or city").max(120),
  province: z.string().trim().min(1, "Enter your province").max(120),
});

export const createHouseSchema = z.object({
  name: z.string().trim().min(1, "Give the house a name").max(120),
  capacity: intFromForm("Capacity", { min: 1, max: 1_000_000 }),
  notes: z.string().trim().max(500).optional().default(""),
});

export const createFlockSchema = z
  .object({
    name: z.string().trim().min(1, "Give the flock a name").max(120),
    breed: z.string().trim().max(120).optional().default(""),
    houseId: uuid,
    initialHens: intFromForm("Number of hens", { min: 1, max: 1_000_000 }),
    placementDate: isoDate,
    startLayingDate: z.union([isoDate, z.literal("")]).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
  })
  .refine(
    (value) =>
      value.startLayingDate === "" || value.startLayingDate >= value.placementDate,
    { message: "Laying cannot start before the hens arrived", path: ["startLayingDate"] }
  );

// ---------------------------------------------------------------------------
// Farm / house / flock management
// ---------------------------------------------------------------------------

/** Same fields as onboarding collects; identical rules apply to an edit. */
export const updateFarmSchema = createFarmSchema;
export const updateHouseSchema = createHouseSchema;

/**
 * Editing a flock, deliberately narrower than creating one: `initialHens` is
 * excluded because it anchors the `current_hens <= initial_hens` check and
 * the mortality history already recorded against it -- changing it after the
 * fact would distort mortality-rate math for records that already exist.
 * `current_hens` itself is never a field at all; it is recalculated by a
 * database trigger whenever `mortality_records` changes.
 */
export const updateFlockSchema = z
  .object({
    name: z.string().trim().min(1, "Give the flock a name").max(120),
    breed: z.string().trim().max(120).optional().default(""),
    houseId: uuid,
    placementDate: isoDate,
    startLayingDate: z.union([isoDate, z.literal("")]).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
  })
  .refine(
    (value) =>
      value.startLayingDate === "" || value.startLayingDate >= value.placementDate,
    { message: "Laying cannot start before the hens arrived", path: ["startLayingDate"] }
  );

/**
 * Retiring a flock is a distinct action from editing one -- a one-way status
 * change with its own audit trail, not a field on the general edit form.
 */
export const retireFlockSchema = z.object({
  status: z.enum(["SOLD", "CLOSED"], {
    errorMap: () => ({ message: "Choose whether the flock was sold or closed" }),
  }),
  notes: z.string().trim().max(500).optional().default(""),
});

export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>;
export type UpdateFlockInput = z.infer<typeof updateFlockSchema>;
export type RetireFlockInput = z.infer<typeof retireFlockSchema>;

// ---------------------------------------------------------------------------
// Egg sizes and pricing
// ---------------------------------------------------------------------------

export const eggPriceRowSchema = z.object({
  eggSizeId: uuid,
  pricePerEgg: decimalFromForm("Price per egg", { max: 10_000 }),
  pricePerTray: decimalFromForm("Price per tray", { max: 100_000 }),
});

export const updatePricesSchema = z.object({
  effectiveFrom: isoDate,
  prices: z.array(eggPriceRowSchema).min(1, "Set at least one price"),
});

// ---------------------------------------------------------------------------
// Inventory adjustments
// ---------------------------------------------------------------------------

/**
 * The farmer picks a direction and a positive quantity; the action turns that
 * into the signed value the table stores. Asking someone to type "-20" to
 * record breakage is a needless way to invite a sign error.
 */
export const inventoryAdjustmentSchema = z.object({
  eggSizeId: uuid,
  direction: z.enum(["ADD", "REMOVE"], {
    errorMap: () => ({ message: "Choose whether to add or remove eggs" }),
  }),
  quantity: intFromForm("Quantity", { min: 1, max: 1_000_000 }),
  reason: z
    .string()
    .trim()
    .regex(/^[A-Z_]+$/, "Choose a reason")
    .max(40),
  note: z.string().trim().max(200).optional().default(""),
  adjustmentDate: isoDate,
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

// ---------------------------------------------------------------------------
// Egg sales
// ---------------------------------------------------------------------------

/**
 * One line of a sale.
 *
 * Trays and loose eggs are priced separately, so both quantities and both
 * prices travel together -- a blended unit price would lose the distinction
 * the farmer actually sells on. The price is a field rather than a lookup
 * because a negotiated price is real, and whatever was used is copied onto the
 * line so re-pricing the farm never restates history.
 */
export const saleLineSchema = z.object({
  eggSizeId: uuid,
  quantityTrays: intFromForm("Trays", { max: 100_000 }).default(0),
  quantityEggs: intFromForm("Eggs", { max: 1_000_000 }).default(0),
  pricePerTray: decimalFromForm("Price per tray", { max: 100_000 }).default(0),
  pricePerEgg: decimalFromForm("Price per egg", { max: 10_000 }).default(0),
});

/**
 * Note what is NOT here: `paymentStatus`. The farmer enters an amount and the
 * status is derived from it, in the app and again in the database. Accepting
 * both invites a sale marked PAID with nothing against it.
 */
export const recordSaleSchema = z
  .object({
    saleDate: isoDate,
    // Walk-in cash sales are the common case, so both of these are optional.
    customerId: z.union([uuid, z.literal("")]).optional().default(""),
    flockId: z.union([uuid, z.literal("")]).optional().default(""),
    amountPaid: decimalFromForm("Amount paid", { max: 100_000_000 }).default(0),
    notes: z.string().trim().max(500).optional().default(""),
    lines: z.array(saleLineSchema).min(1, "Add at least one egg size"),
  })
  .refine(
    (v) => v.lines.some((line) => line.quantityTrays > 0 || line.quantityEggs > 0),
    { message: "Enter how many trays or eggs you sold", path: ["lines"] }
  );

export const recordPaymentSchema = z.object({
  amount: decimalFromForm("Amount", { min: 0.01, max: 100_000_000 }),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name").max(120),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

export const updateCustomerSchema = createCustomerSchema;

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]], {
    errorMap: () => ({ message: "Choose a category" }),
  }),
  description: z.string().trim().max(200).optional().default(""),
  amount: decimalFromForm("Amount", { min: 0.01, max: 100_000_000 }),
  expenseDate: isoDate,
  flockId: z.union([uuid, z.literal("")]).optional().default(""),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/** Development-only: set a farm's plan/status directly, bypassing billing. */
export const devSetSubscriptionSchema = z.object({
  plan: z.enum(PLAN_ORDER as [SubscriptionPlan, ...SubscriptionPlan[]], {
    errorMap: () => ({ message: "Choose a plan" }),
  }),
  status: z.enum(SUBSCRIPTION_STATUSES as [SubscriptionStatus, ...SubscriptionStatus[]], {
    errorMap: () => ({ message: "Choose a status" }),
  }),
});

export type RecordSaleInput = z.infer<typeof recordSaleSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ---------------------------------------------------------------------------
// Daily production
// ---------------------------------------------------------------------------

export const eggSizeQuantitySchema = z.object({
  eggSizeId: uuid,
  quantity: intFromForm("Egg size quantity", { max: 1_000_000 }),
});

export const dailyProductionSchema = z
  .object({
    flockId: uuid,
    productionDate: isoDate,
    hensPresent: intFromForm("Hens present", { max: 1_000_000 }),
    eggsCollected: intFromForm("Eggs collected", { max: 1_000_000 }),
    brokenEggs: intFromForm("Broken eggs", { max: 1_000_000 }).default(0),
    dirtyEggs: intFromForm("Dirty eggs", { max: 1_000_000 }).default(0),
    mortality: intFromForm("Mortality", { max: 1_000_000 }).default(0),
    averageEggWeight: z
      .union([decimalFromForm("Average egg weight", { max: 500 }), z.literal("")])
      .optional(),
    feedKg: decimalFromForm("Feed used", { max: 100_000 }).default(0),
    feedCostPerKg: decimalFromForm("Feed cost per kg", { max: 10_000 }).default(0),
    sizes: z.array(eggSizeQuantitySchema).default([]),
    notes: z.string().trim().max(500).optional().default(""),
  })
  .refine((v) => v.brokenEggs + v.dirtyEggs <= v.eggsCollected, {
    message: "Broken and dirty eggs cannot exceed the eggs you collected",
    path: ["brokenEggs"],
  })
  .refine(
    (v) => v.sizes.reduce((sum, s) => sum + s.quantity, 0) <= v.eggsCollected,
    {
      message: "The egg sizes add up to more than the eggs you collected",
      path: ["sizes"],
    }
  );

// ---------------------------------------------------------------------------
// Flock operations: standalone mortality, feed and vaccinations
// ---------------------------------------------------------------------------

/**
 * These cover the ad-hoc entries that do not belong to a collection day --
 * a mid-week cull, a feed delivery, a vaccination round. Rows written through
 * these schemas always leave `daily_production_id` null; the linked rows stay
 * the exclusive property of the record_daily_production RPC, which deletes and
 * re-inserts whatever it finds attached to the day it is saving.
 */

/**
 * `clientId`, set only by the offline queue (lib/offline/), is the
 * idempotency key a retried sync lands on -- see
 * supabase/migrations/20250101001400_offline_idempotency.sql. Every online
 * submission from these forms omits it, unchanged from before that queue
 * existed.
 */
export const mortalityRecordSchema = z.object({
  flockId: uuid,
  recordDate: isoDate,
  quantity: intFromForm("Birds lost", { min: 1, max: 1_000_000 }),
  reason: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  clientId: z.string().uuid().optional(),
});

export const feedUsageSchema = z.object({
  flockId: uuid,
  usageDate: isoDate,
  quantityKg: decimalFromForm("Feed used", { min: 0, max: 100_000 }),
  costPerKg: decimalFromForm("Feed cost per kg", { max: 10_000 }).default(0),
  feedType: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  clientId: z.string().uuid().optional(),
});

export const vaccinationSchema = z.object({
  flockId: uuid,
  vaccinationDate: isoDate,
  vaccineName: z.string().trim().min(1, "Enter the vaccine name").max(120),
  notes: z.string().trim().max(500).optional().default(""),
});

export type MortalityRecordInput = z.infer<typeof mortalityRecordSchema>;
export type FeedUsageInput = z.infer<typeof feedUsageSchema>;
export type VaccinationInput = z.infer<typeof vaccinationSchema>;

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

/**
 * OWNER is deliberately not an option.
 *
 * A farm has exactly one owner, established by app.claim_farm_ownership() when
 * the farm is created, and the database backs that up with a CHECK on
 * farm_invitations.role. Offering it here would only produce a constraint
 * violation the farmer cannot act on.
 */
export const invitableRoles = ["MANAGER", "WORKER"] as const;

export const inviteMemberSchema = z.object({
  // Lower-cased to match the partial unique index on (farm_id, lower(email)),
  // so "Ana@" and "ana@" cannot both sit pending.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter an email address")
    .max(255)
    .email("That doesn't look like an email address"),
  role: z.enum(invitableRoles, {
    errorMap: () => ({ message: "Choose manager or worker" }),
  }),
});

export const updateMemberRoleSchema = z.object({
  memberId: uuid,
  role: z.enum(invitableRoles, {
    errorMap: () => ({ message: "Choose manager or worker" }),
  }),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * A farmer edits only their own row; `id` is never accepted from the client,
 * it comes from the verified session. Phone stays loose on purpose -- PH
 * numbers get written every which way and rejecting them helps nobody.
 */
export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  phone: z.string().trim().max(40).optional().default(""),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type DailyProductionInput = z.infer<typeof dailyProductionSchema>;
export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type CreateFlockInput = z.infer<typeof createFlockSchema>;

/** Flatten Zod issues into the `{ field: message }` shape forms expect. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    errors[key] ??= issue.message;
  }
  return errors;
}
