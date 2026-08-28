"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageCustomers, canManageSales } from "@/lib/auth/permissions";
import { assertCanAccess, assertCanCreate } from "@/lib/subscriptions/entitlements";
import { getCustomerCount, getStockForWarning } from "@/lib/data/sales";
import {
  checkSaleAgainstStock,
  derivePaymentStatus,
  summariseSale,
  type StockWarning,
} from "@/lib/domain/sales";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  createCustomerSchema,
  recordSaleSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

export interface RecordedSale {
  saleId: string;
  /** Sizes the sale took below zero. The sale still saved -- see below. */
  warnings: StockWarning[];
}

/**
 * Record one egg sale.
 *
 * The gate order is deliberate: who are you, which farm, may your role do this,
 * does your plan include it, is the input well-formed -- and only then the
 * write. Egg Sales is a Starter feature, so this is the first place the
 * entitlement layer actually refuses something.
 *
 * The stock check WARNS rather than blocks. Farms sell before recording the
 * morning collection, so a sale that outruns the balance usually means the
 * records are behind, not that the farmer is wrong; refusing it would make the
 * app disagree with reality. Inventory then shows negative in red, which the
 * inventory screen already surfaces.
 */
export async function recordSaleAction(
  input: unknown
): Promise<ActionResult<RecordedSale>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageSales(context)) {
    return failure("Your role doesn't allow recording sales.");
  }

  const parsed = recordSaleSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the sale below.", toFieldErrors(parsed.error));
  }

  const values = parsed.data;

  // Empty rows are how the form offers "add another size"; they are not lines.
  const lines = values.lines.filter(
    (line) => line.quantityTrays > 0 || line.quantityEggs > 0
  );

  if (lines.length === 0) {
    return failure("Enter how many trays or eggs you sold.", {
      lines: "Enter how many trays or eggs you sold",
    });
  }

  try {
    const entitlement = { plan: context.plan, status: context.subscriptionStatus };
    assertCanAccess(entitlement, "egg_sales");

    // Read fresh: the balances the browser warned against may be minutes old.
    const stock = await getStockForWarning(context.farmId);
    const warnings = checkSaleAgainstStock(lines, stock.balances, stock.names);

    const supabase = await createSupabaseServerClient();

    /*
     * One transaction across egg_sales and egg_sale_items. The function runs
     * SECURITY INVOKER, so RLS still applies; farm_id is derived from the egg
     * sizes rather than trusted from here, and the total is computed from the
     * lines rather than sent.
     */
    const { data: saleId, error } = await supabase.rpc("record_egg_sale", {
      p_sale_date: values.saleDate,
      p_customer_id: values.customerId || undefined,
      p_flock_id: values.flockId || undefined,
      p_amount_paid: values.amountPaid,
      p_notes: values.notes || undefined,
      p_items: lines.map((line) => ({
        egg_size_id: line.eggSizeId,
        quantity_trays: line.quantityTrays,
        quantity_eggs: line.quantityEggs,
        price_per_tray: line.pricePerTray,
        price_per_egg: line.pricePerEgg,
      })),
    });

    if (error) return describeDatabaseError(error, "recordSaleAction");
    if (!saleId) return failure("We couldn't save that sale. Please try again.");

    const summary = summariseSale(lines);

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.SALE_RECORDED,
      entityType: "egg_sale",
      entityId: saleId,
      metadata: {
        date: values.saleDate,
        total: summary.total,
        amountPaid: values.amountPaid,
        paymentStatus: derivePaymentStatus(summary.total, values.amountPaid),
        eggs: summary.totalEggs,
        customerId: values.customerId || null,
        soldBeyondStock: warnings.length > 0,
      },
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { ok: true, data: { saleId, warnings } };
  } catch (error) {
    return describeUnknownError(error, "recordSaleAction");
  }
}

/**
 * Add a customer without leaving the sale form.
 *
 * Deliberately inline: a farmer part-way through recording a sale to a new
 * sari-sari store should not have to abandon it, go to another screen and
 * start again.
 */
export async function createCustomerAction(
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageCustomers(context)) {
    return failure("Your role doesn't allow adding customers.");
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the details below.", toFieldErrors(parsed.error));
  }

  const values = parsed.data;

  try {
    const entitlement = { plan: context.plan, status: context.subscriptionStatus };
    assertCanAccess(entitlement, "customers");
    assertCanCreate(entitlement, "customers", await getCustomerCount(context.farmId));

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        farm_id: context.farmId,
        name: values.name,
        phone: values.phone || null,
        address: values.address || null,
      })
      .select("id, name")
      .single();

    if (error) return describeDatabaseError(error, "createCustomerAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.CUSTOMER_CREATED,
      entityType: "customer",
      entityId: data.id,
      metadata: { name: data.name },
    });

    revalidatePath("/sales");

    return { ok: true, data };
  } catch (error) {
    return describeUnknownError(error, "createCustomerAction");
  }
}
