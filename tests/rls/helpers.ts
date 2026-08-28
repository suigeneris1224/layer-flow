import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Helpers for the RLS isolation suite.
 *
 * These talk to a real local Supabase (`npm run db:start`). Defaults are the
 * standard Supabase CLI local values, so the suite runs without a .env file;
 * override via environment variables to point somewhere else.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export type Client = SupabaseClient<Database>;

/** Bypasses RLS. Used only to build fixtures and to clean up. */
export function adminClient(): Client {
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function anonClient(): Client {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Is a local Supabase actually reachable? Lets the suite skip with a clear message. */
export async function isSupabaseReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface TestUser {
  id: string;
  email: string;
  client: Client;
}

/**
 * Create a confirmed user and return a client already carrying their session.
 *
 * Every request that client makes runs as that user, so RLS applies exactly as
 * it would in the app.
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const admin = adminClient();
  const email = `rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@layerflow.test`;
  const password = "test-password-1234";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}` },
  });

  if (error || !data.user) {
    throw new Error(`Could not create test user: ${error?.message ?? "no user returned"}`);
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Could not sign in test user: ${signInError.message}`);

  return { id: data.user.id, email, client };
}

/**
 * A farm with one of everything, built with admin rights.
 *
 * Fixtures are created bypassing RLS on purpose: the point of the suite is to
 * test *reads and writes by other users*, so the setup must not itself depend
 * on the policies under test.
 */
export interface FarmFixture {
  farmId: string;
  houseId: string;
  flockId: string;
  eggSizeId: string;
  productionId: string;
  saleId: string;
  customerId: string;
}

export async function createFarmFixture(ownerId: string, name: string): Promise<FarmFixture> {
  const admin = adminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: farm, error: farmError } = await admin
    .from("farms")
    .insert({ name, municipality: "San Remigio", province: "Cebu", owner_id: ownerId })
    .select("id")
    .single();
  if (farmError) throw new Error(`fixture farm: ${farmError.message}`);
  const farmId = farm.id;

  const { data: house } = await admin
    .from("houses")
    .insert({ farm_id: farmId, name: "House A", capacity: 1000 })
    .select("id")
    .single();

  const { data: flock } = await admin
    .from("flocks")
    .insert({
      farm_id: farmId,
      house_id: house!.id,
      name: "Flock #001",
      breed: "ISA Brown",
      initial_hens: 500,
      current_hens: 500,
      placement_date: today,
    })
    .select("id")
    .single();

  const { data: eggSize } = await admin
    .from("egg_sizes")
    .insert({ farm_id: farmId, name: "Large", code: "LARGE", sort_order: 3 })
    .select("id")
    .single();

  await admin.from("egg_prices").insert({
    farm_id: farmId,
    egg_size_id: eggSize!.id,
    price_per_egg: 7,
    price_per_tray: 210,
    effective_from: today,
  });

  const { data: production } = await admin
    .from("daily_production")
    .insert({
      farm_id: farmId,
      flock_id: flock!.id,
      production_date: today,
      hens_present: 500,
      eggs_collected: 400,
    })
    .select("id")
    .single();

  await admin.from("daily_egg_size_production").insert({
    daily_production_id: production!.id,
    egg_size_id: eggSize!.id,
    quantity: 400,
  });

  await admin.from("feed_usage").insert({
    farm_id: farmId,
    flock_id: flock!.id,
    usage_date: today,
    quantity_kg: 60,
    cost_per_kg: 28,
    total_cost: 1680,
  });

  await admin.from("mortality_records").insert({
    farm_id: farmId,
    flock_id: flock!.id,
    record_date: today,
    quantity: 2,
  });

  await admin.from("vaccinations").insert({
    farm_id: farmId,
    flock_id: flock!.id,
    vaccination_date: today,
    vaccine_name: "Newcastle",
  });

  const { data: customer } = await admin
    .from("customers")
    .insert({ farm_id: farmId, name: "Aling Maria" })
    .select("id")
    .single();

  const { data: sale } = await admin
    .from("egg_sales")
    .insert({
      farm_id: farmId,
      customer_id: customer!.id,
      sale_date: today,
      total_amount: 2100,
      // egg_sales_payment_consistent: a PAID sale must have the money against
      // it. The status alone is not enough.
      amount_paid: 2100,
      payment_status: "PAID",
    })
    .select("id")
    .single();

  await admin.from("egg_sale_items").insert({
    sale_id: sale!.id,
    egg_size_id: eggSize!.id,
    quantity_eggs: 0,
    quantity_trays: 10,
    price_per_egg: 7,
    price_per_tray: 210,
    subtotal: 2100,
  });

  await admin.from("expenses").insert({
    farm_id: farmId,
    category: "LABOR",
    description: "Helper",
    amount: 1500,
    expense_date: today,
  });

  await admin.from("egg_inventory_adjustments").insert({
    farm_id: farmId,
    egg_size_id: eggSize!.id,
    adjustment_date: today,
    quantity_eggs: -10,
    reason: "Spoilage",
  });

  await admin.from("audit_logs").insert({
    farm_id: farmId,
    user_id: ownerId,
    action: "farm.created",
    entity_type: "farm",
    entity_id: farmId,
  });

  return {
    farmId,
    houseId: house!.id,
    flockId: flock!.id,
    eggSizeId: eggSize!.id,
    productionId: production!.id,
    saleId: sale!.id,
    customerId: customer!.id,
  };
}

/** Add a user to a farm with a given role. */
export async function addMember(
  farmId: string,
  userId: string,
  role: "OWNER" | "MANAGER" | "WORKER"
) {
  const admin = adminClient();
  const { error } = await admin
    .from("farm_members")
    .upsert({ farm_id: farmId, user_id: userId, role }, { onConflict: "farm_id,user_id" });
  if (error) throw new Error(`addMember: ${error.message}`);
}

/**
 * Remove everything the suite created.
 *
 * Deleting a farm does NOT cascade cleanly, because four RESTRICT constraints
 * block the cascade partway through:
 *
 *   flocks.house_id                       -> houses
 *   daily_egg_size_production.egg_size_id -> egg_sizes
 *   egg_sale_items.egg_size_id            -> egg_sizes
 *   egg_inventory_adjustments.egg_size_id -> egg_sizes
 *
 * plus farms.owner_id -> auth.users, which is why the user goes last.
 *
 * So the children holding those references have to go first, in an order where
 * each step unblocks the next. Errors are surfaced rather than swallowed: a
 * silent failure here leaves test farms behind and quietly pollutes the
 * development database, which is exactly what happened before.
 *
 * Worth noting: this is not only a test problem. It means a farm cannot be
 * deleted through the app either, which will matter for account deletion.
 */
export async function cleanup(userIds: string[]) {
  const admin = adminClient();
  const problems: string[] = [];

  const { data: farms, error: farmsError } = await admin
    .from("farms")
    .select("id")
    .in("owner_id", userIds);

  if (farmsError) problems.push(`list farms: ${farmsError.message}`);

  const farmIds = (farms ?? []).map((farm) => farm.id);

  if (farmIds.length > 0) {
    /*
     * Order matters; each step unblocks the next.
     *   egg_sales      cascades to egg_sale_items, freeing egg_sizes
     *   daily_production cascades to the size breakdown, freeing egg_sizes
     *   adjustments    reference egg_sizes directly
     *   flocks         must go before houses
     * The farm delete then cascades the rest: egg_sizes, prices, customers,
     * expenses, subscriptions, members, audit logs.
     */
    const ORDER = [
      "egg_sales",
      "daily_production",
      "egg_inventory_adjustments",
      "flocks",
      "houses",
    ] as const;

    for (const table of ORDER) {
      const { error } = await admin.from(table).delete().in("farm_id", farmIds);
      if (error) problems.push(`delete ${table}: ${error.message}`);
    }

    const { error } = await admin.from("farms").delete().in("id", farmIds);
    if (error) problems.push(`delete farms: ${error.message}`);
  }

  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) problems.push(`delete user: ${error.message}`);
  }

  if (problems.length > 0) {
    throw new Error(`RLS cleanup left data behind:\n  ${problems.join("\n  ")}`);
  }
}
