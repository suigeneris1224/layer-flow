"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_FARM_COOKIE, getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageFlock } from "@/lib/auth/permissions";
import { assertCanCreate } from "@/lib/subscriptions/entitlements";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { DEFAULT_PRICES } from "@/lib/domain/default-prices";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionFailure,
} from "@/lib/errors";
import {
  createFarmSchema,
  createFlockSchema,
  createHouseSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";

export type OnboardingActionState = ActionFailure | undefined;

export async function createFarmAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();

  const parsed = createFarmSchema.safeParse({
    name: formData.get("name"),
    barangay: formData.get("barangay"),
    municipality: formData.get("municipality"),
    province: formData.get("province"),
  });

  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  let farmId: string;

  try {
    const supabase = await createSupabaseServerClient();

    // Plan limit on farms is counted from existing memberships, never from
    // anything the browser sent.
    const { count } = await supabase
      .from("farm_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const existingFarms = count ?? 0;
    if (existingFarms > 0) {
      const context = await getFarmContext();
      assertCanCreate(
        { plan: context?.plan ?? "FREE", status: context?.subscriptionStatus ?? "ACTIVE" },
        "farms",
        existingFarms
      );
    }

    /*
     * The id is generated here rather than read back, and that is load-bearing.
     *
     * `.select()` makes PostgREST issue INSERT ... RETURNING, and the returned
     * row must satisfy the SELECT policy `farms_select_member(id)` inside the
     * same statement. That calls app.is_farm_member, which is STABLE and so
     * sees the snapshot from the start of the statement -- before the
     * farms_claim_ownership AFTER INSERT trigger has added the membership. The
     * row is written and then rejected on the way out, surfacing as "new row
     * violates row-level security policy" and leaving onboarding unable to
     * finish. Supplying the id means we never have to read it back.
     */
    const newFarmId = randomUUID();

    const { error } = await supabase.from("farms").insert({
      id: newFarmId,
      name: parsed.data.name,
      barangay: parsed.data.barangay || null,
      municipality: parsed.data.municipality,
      province: parsed.data.province,
      // owner_id must match auth.uid() or the RLS check rejects the insert.
      owner_id: user.id,
    });

    if (error) return describeDatabaseError(error, "createFarmAction");
    farmId = newFarmId;

    // Triggers have already added the OWNER membership, a FREE subscription
    // and nothing else; egg sizes are ours to seed.
    const { error: sizesError } = await supabase.rpc(
      "seed_default_egg_sizes" as never,
      { farm: farmId } as never
    );

    // The RPC lives in the `app` schema, which PostgREST does not expose, so
    // fall back to a plain insert. Kept as a fallback rather than the only
    // path so the SQL function stays the single definition of the defaults.
    if (sizesError) {
      await supabase.from("egg_sizes").insert([
        { farm_id: farmId, name: "Small", code: "SMALL", sort_order: 1 },
        { farm_id: farmId, name: "Medium", code: "MEDIUM", sort_order: 2 },
        { farm_id: farmId, name: "Large", code: "LARGE", sort_order: 3 },
        { farm_id: farmId, name: "Extra Large", code: "EXTRA_LARGE", sort_order: 4 },
        { farm_id: farmId, name: "Jumbo", code: "JUMBO", sort_order: 5 },
      ]);
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_FARM_COOKIE, farmId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    await recordAuditLog({
      farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FARM_CREATED,
      entityType: "farm",
      entityId: farmId,
      metadata: { name: parsed.data.name },
    });
  } catch (error) {
    return describeUnknownError(error, "createFarmAction");
  }

  revalidatePath("/onboarding");
  redirect("/onboarding");
}

export async function createHouseAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Create your farm first.");
  if (!canManageFlock(context)) {
    return failure("You don't have permission to add houses.");
  }

  const parsed = createHouseSchema.safeParse({
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { count } = await supabase
      .from("houses")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", context.farmId);

    assertCanCreate(
      { plan: context.plan, status: context.subscriptionStatus },
      "houses",
      count ?? 0
    );

    const { data, error } = await supabase
      .from("houses")
      .insert({
        farm_id: context.farmId,
        name: parsed.data.name,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "createHouseAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.HOUSE_CREATED,
      entityType: "house",
      entityId: data.id,
      metadata: { name: parsed.data.name, capacity: parsed.data.capacity },
    });
  } catch (error) {
    return describeUnknownError(error, "createHouseAction");
  }

  revalidatePath("/onboarding");
  redirect("/onboarding");
}

export async function createFlockAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Create your farm first.");
  if (!canManageFlock(context)) {
    return failure("You don't have permission to add flocks.");
  }

  const parsed = createFlockSchema.safeParse({
    name: formData.get("name"),
    breed: formData.get("breed"),
    houseId: formData.get("houseId"),
    initialHens: formData.get("initialHens"),
    placementDate: formData.get("placementDate"),
    startLayingDate: formData.get("startLayingDate") ?? "",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Only GROWING and PRODUCING flocks count against the plan; a sold or
    // closed flock is history, not capacity in use.
    const { count } = await supabase
      .from("flocks")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", context.farmId)
      .in("status", ["GROWING", "PRODUCING"]);

    assertCanCreate(
      { plan: context.plan, status: context.subscriptionStatus },
      "active_flocks",
      count ?? 0
    );

    const { data, error } = await supabase
      .from("flocks")
      .insert({
        farm_id: context.farmId,
        house_id: parsed.data.houseId,
        name: parsed.data.name,
        breed: parsed.data.breed,
        initial_hens: parsed.data.initialHens,
        current_hens: parsed.data.initialHens,
        placement_date: parsed.data.placementDate,
        start_laying_date: parsed.data.startLayingDate || null,
        status: parsed.data.startLayingDate ? "PRODUCING" : "GROWING",
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "createFlockAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FLOCK_CREATED,
      entityType: "flock",
      entityId: data.id,
      metadata: { name: parsed.data.name, hens: parsed.data.initialHens },
    });
  } catch (error) {
    return describeUnknownError(error, "createFlockAction");
  }

  revalidatePath("/onboarding");
  redirect("/onboarding");
}

/**
 * Save opening prices for every active egg size and finish onboarding.
 */
export async function saveInitialPricesAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Create your farm first.");
  if (!canManageFlock(context)) {
    return failure("You don't have permission to set prices.");
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: sizes, error: sizesError } = await supabase
      .from("egg_sizes")
      .select("id, code")
      .eq("farm_id", context.farmId)
      .eq("is_active", true)
      .order("sort_order");

    if (sizesError) return describeDatabaseError(sizesError, "saveInitialPricesAction");
    if (!sizes || sizes.length === 0) {
      return failure("No egg sizes are set up for this farm yet.");
    }

    const effectiveFrom = String(formData.get("effectiveFrom") ?? "");
    const rows: {
      farm_id: string;
      egg_size_id: string;
      price_per_egg: number;
      price_per_tray: number;
      effective_from: string;
    }[] = [];

    for (const size of sizes) {
      const fallback = DEFAULT_PRICES[size.code] ?? { perEgg: 0, perTray: 0 };
      const perEgg = Number(formData.get(`perEgg.${size.id}`) ?? fallback.perEgg);
      const perTray = Number(formData.get(`perTray.${size.id}`) ?? fallback.perTray);

      if (!Number.isFinite(perEgg) || !Number.isFinite(perTray) || perEgg < 0 || perTray < 0) {
        return failure("Prices must be zero or more.");
      }

      rows.push({
        farm_id: context.farmId,
        egg_size_id: size.id,
        price_per_egg: perEgg,
        price_per_tray: perTray,
        effective_from: /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)
          ? effectiveFrom
          : new Date().toISOString().slice(0, 10),
      });
    }

    const { error } = await supabase.from("egg_prices").insert(rows);
    if (error) return describeDatabaseError(error, "saveInitialPricesAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.PRICES_UPDATED,
      entityType: "egg_prices",
      metadata: { sizes: rows.length, effectiveFrom: rows[0]?.effective_from },
    });
  } catch (error) {
    return describeUnknownError(error, "saveInitialPricesAction");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
