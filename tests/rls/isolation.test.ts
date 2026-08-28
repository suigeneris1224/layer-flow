import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addMember,
  adminClient,
  anonClient,
  cleanup,
  createFarmFixture,
  createTestUser,
  isSupabaseReachable,
  type Client,
  type FarmFixture,
  type TestUser,
} from "./helpers";

/**
 * Tenant isolation, proven rather than assumed.
 *
 * Two farms, separate owners. Every assertion here is about what user B can
 * reach of farm A's data. A passing run is the evidence that RLS -- not
 * middleware, not a UI check -- is what keeps farms apart.
 *
 * Requires a running local Supabase: `npm run db:start`.
 */

const reachable = await isSupabaseReachable();

const suite = reachable ? describe : describe.skip;

if (!reachable) {
  console.warn(
    "\n  Skipping RLS suite: no Supabase at NEXT_PUBLIC_SUPABASE_URL.\n" +
      "  Start it with `npm run db:start`.\n"
  );
}

suite("RLS tenant isolation", () => {
  let alice: TestUser;
  let bob: TestUser;
  let worker: TestUser;
  let farmA: FarmFixture;
  let farmB: FarmFixture;

  beforeAll(async () => {
    alice = await createTestUser("alice");
    bob = await createTestUser("bob");
    worker = await createTestUser("worker");

    farmA = await createFarmFixture(alice.id, "Alice Farm");
    farmB = await createFarmFixture(bob.id, "Bob Farm");

    await addMember(farmA.farmId, worker.id, "WORKER");
  }, 60_000);

  afterAll(async () => {
    await cleanup([alice.id, bob.id, worker.id]);
  }, 60_000);

  // Every farm-scoped table. If a table is added to the schema and not to this
  // list, that is a gap in the proof.
  const FARM_SCOPED = [
    "houses",
    "flocks",
    "egg_sizes",
    "egg_prices",
    "daily_production",
    "feed_usage",
    "mortality_records",
    "vaccinations",
    "customers",
    "egg_sales",
    "expenses",
    "egg_inventory_adjustments",
    "subscriptions",
  ] as const;

  describe("reads", () => {
    it.each(FARM_SCOPED)("bob cannot select farm A rows from %s", async (table) => {
      const { data, error } = await bob.client
        .from(table)
        .select("id")
        .eq("farm_id", farmA.farmId);

      // RLS filters rather than errors: the correct outcome is an empty set.
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("alice can read her own farm's rows", async () => {
      const { data, error } = await alice.client
        .from("houses")
        .select("id")
        .eq("farm_id", farmA.farmId);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });

    it("bob cannot see farm A itself", async () => {
      const { data } = await bob.client.from("farms").select("id").eq("id", farmA.farmId);
      expect(data).toEqual([]);
    });

    it("bob cannot enumerate farm A's members", async () => {
      const { data } = await bob.client
        .from("farm_members")
        .select("id")
        .eq("farm_id", farmA.farmId);
      expect(data).toEqual([]);
    });

    it("bob cannot read farm A's egg size breakdown through the child table", async () => {
      const { data } = await bob.client
        .from("daily_egg_size_production")
        .select("id")
        .eq("daily_production_id", farmA.productionId);
      expect(data).toEqual([]);
    });

    it("bob cannot read farm A's sale items through the child table", async () => {
      const { data } = await bob.client
        .from("egg_sale_items")
        .select("id")
        .eq("sale_id", farmA.saleId);
      expect(data).toEqual([]);
    });

    it("bob cannot read farm A's inventory view rows", async () => {
      const { data } = await bob.client
        .from("egg_inventory_balances")
        .select("egg_size_id")
        .eq("farm_id", farmA.farmId);
      expect(data).toEqual([]);
    });

    it("bob cannot read farm A's audit log", async () => {
      const { data } = await bob.client
        .from("audit_logs")
        .select("id")
        .eq("farm_id", farmA.farmId);
      expect(data).toEqual([]);
    });

    it("a signed-out client reads nothing at all", async () => {
      const stranger = anonClient();
      const { data } = await stranger.from("daily_production").select("id");
      expect(data ?? []).toEqual([]);
    });
  });

  describe("writes", () => {
    it("bob cannot update farm A's production", async () => {
      const { data } = await bob.client
        .from("daily_production")
        .update({ eggs_collected: 999_999 })
        .eq("id", farmA.productionId)
        .select("id");

      expect(data ?? []).toEqual([]);

      const admin = adminClient();
      const { data: actual } = await admin
        .from("daily_production")
        .select("eggs_collected")
        .eq("id", farmA.productionId)
        .single();

      expect(actual?.eggs_collected).toBe(400);
    });

    it("bob cannot delete farm A's flock", async () => {
      await bob.client.from("flocks").delete().eq("id", farmA.flockId);

      const admin = adminClient();
      const { data } = await admin.from("flocks").select("id").eq("id", farmA.flockId);
      expect(data?.length).toBe(1);
    });

    it("bob cannot insert a row into farm A", async () => {
      const { error } = await bob.client
        .from("houses")
        .insert({ farm_id: farmA.farmId, name: "Trojan House", capacity: 100 });

      expect(error).not.toBeNull();
    });

    it("a user cannot create a farm owned by someone else", async () => {
      const { error } = await bob.client.from("farms").insert({
        name: "Impersonated",
        municipality: "X",
        province: "Y",
        owner_id: alice.id,
      });

      expect(error).not.toBeNull();
    });

    it("subscriptions cannot be upgraded from a client session", async () => {
      await bob.client
        .from("subscriptions")
        .update({ plan: "PRO" })
        .eq("farm_id", farmB.farmId);

      const admin = adminClient();
      const { data } = await admin
        .from("subscriptions")
        .select("plan")
        .eq("farm_id", farmB.farmId)
        .single();

      // No client write policy exists on subscriptions, by design.
      expect(data?.plan).toBe("FREE");
    });

    it("audit log entries cannot be rewritten or deleted", async () => {
      const admin = adminClient();
      const { data: before } = await admin
        .from("audit_logs")
        .select("id, action")
        .eq("farm_id", farmB.farmId)
        .limit(1)
        .single();

      await bob.client.from("audit_logs").update({ action: "tampered" }).eq("id", before!.id);
      await bob.client.from("audit_logs").delete().eq("id", before!.id);

      const { data: after } = await admin
        .from("audit_logs")
        .select("action")
        .eq("id", before!.id)
        .maybeSingle();

      expect(after?.action).toBe(before!.action);
    });

    it("bob cannot adjust farm A's stock", async () => {
      const { error } = await bob.client.from("egg_inventory_adjustments").insert({
        farm_id: farmA.farmId,
        egg_size_id: farmA.eggSizeId,
        adjustment_date: new Date().toISOString().slice(0, 10),
        quantity_eggs: -100,
        reason: "SPOILAGE",
      });

      expect(error).not.toBeNull();
    });

    it("an adjustment carrying another farm's egg size cannot move that farm's stock", async () => {
      /*
       * RLS checks farm_id on this row but says nothing about which farm the
       * egg_size_id belongs to, and the foreign key only requires that the
       * size exists. So the insert itself may well succeed.
       *
       * What must hold is that it cannot reach farm A: the balances view joins
       * on BOTH farm_id and egg_size_id, so a row pairing farm B with farm A's
       * size matches neither farm and is inert. That containment is the
       * property worth asserting -- not whether the insert was refused.
       */
      const admin = adminClient();
      const { data: before } = await admin
        .from("egg_inventory_balances")
        .select("eggs_available")
        .eq("farm_id", farmA.farmId)
        .eq("egg_size_id", farmA.eggSizeId)
        .single();

      await bob.client.from("egg_inventory_adjustments").insert({
        farm_id: farmB.farmId,
        egg_size_id: farmA.eggSizeId,
        adjustment_date: new Date().toISOString().slice(0, 10),
        quantity_eggs: -5,
        reason: "SPOILAGE",
      });

      const { data: after } = await admin
        .from("egg_inventory_balances")
        .select("eggs_available")
        .eq("farm_id", farmA.farmId)
        .eq("egg_size_id", farmA.eggSizeId)
        .single();

      expect(after?.eggs_available).toBe(before?.eggs_available);
    });

    it("an audit entry cannot be attributed to another user", async () => {
      const { error } = await bob.client.from("audit_logs").insert({
        farm_id: farmB.farmId,
        user_id: alice.id,
        action: "forged",
        entity_type: "farm",
      });

      expect(error).not.toBeNull();
    });
  });

  describe("roles within a farm", () => {
    it("a worker can record production", async () => {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      const { error } = await worker.client.from("daily_production").insert({
        farm_id: farmA.farmId,
        flock_id: farmA.flockId,
        production_date: tomorrow,
        hens_present: 500,
        eggs_collected: 380,
      });

      expect(error).toBeNull();
    });

    it("a worker cannot record a sale", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await worker.client.from("egg_sales").insert({
        farm_id: farmA.farmId,
        sale_date: today,
        total_amount: 100,
      });

      expect(error).not.toBeNull();
    });

    it("a worker cannot record an expense", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await worker.client.from("expenses").insert({
        farm_id: farmA.farmId,
        category: "OTHER",
        description: "x",
        amount: 1,
        expense_date: today,
      });

      expect(error).not.toBeNull();
    });

    it("a worker cannot change egg prices", async () => {
      const { data } = await worker.client
        .from("egg_prices")
        .update({ price_per_tray: 1 })
        .eq("farm_id", farmA.farmId)
        .select("id");

      expect(data ?? []).toEqual([]);
    });

    it("a worker cannot adjust stock", async () => {
      // Adjustments rewrite inventory, so they sit with the manager role
      // alongside sales and pricing rather than with daily recording.
      const { error } = await worker.client.from("egg_inventory_adjustments").insert({
        farm_id: farmA.farmId,
        egg_size_id: farmA.eggSizeId,
        adjustment_date: new Date().toISOString().slice(0, 10),
        quantity_eggs: -5,
        reason: "SPOILAGE",
      });

      expect(error).not.toBeNull();
    });

    it("a worker cannot add themselves as owner", async () => {
      const { error } = await worker.client
        .from("farm_members")
        .update({ role: "OWNER" })
        .eq("farm_id", farmA.farmId)
        .eq("user_id", worker.id)
        .select("id");

      const admin = adminClient();
      const { data } = await admin
        .from("farm_members")
        .select("role")
        .eq("farm_id", farmA.farmId)
        .eq("user_id", worker.id)
        .single();

      expect(data?.role).toBe("WORKER");
      void error;
    });

    it("a worker can read their own farm", async () => {
      const { data } = await worker.client
        .from("flocks")
        .select("id")
        .eq("farm_id", farmA.farmId);

      expect(data?.length).toBeGreaterThan(0);
    });
  });

  describe("set_egg_price RPC", () => {
    it("refuses an egg size belonging to another farm", async () => {
      const { error } = await bob.client.rpc("set_egg_price", {
        p_egg_size_id: farmA.eggSizeId,
        p_price_per_egg: 1,
        p_price_per_tray: 30,
        p_effective_from: new Date().toISOString().slice(0, 10),
      });

      expect(error).not.toBeNull();
    });

    it("leaves another farm's price untouched", async () => {
      const admin = adminClient();
      const { data: before } = await admin
        .from("egg_prices")
        .select("price_per_tray")
        .eq("egg_size_id", farmA.eggSizeId)
        .is("effective_to", null)
        .maybeSingle();

      await bob.client.rpc("set_egg_price", {
        p_egg_size_id: farmA.eggSizeId,
        p_price_per_egg: 99,
        p_price_per_tray: 999,
        p_effective_from: new Date().toISOString().slice(0, 10),
      });

      const { data: after } = await admin
        .from("egg_prices")
        .select("price_per_tray")
        .eq("egg_size_id", farmA.eggSizeId)
        .is("effective_to", null)
        .maybeSingle();

      expect(after?.price_per_tray).toBe(before?.price_per_tray);
    });

    it("accepts the farm's own size and opens a new range", async () => {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await bob.client.rpc("set_egg_price", {
        p_egg_size_id: farmB.eggSizeId,
        p_price_per_egg: 7.5,
        p_price_per_tray: 225,
        p_effective_from: tomorrow,
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it("replaces in place when the start date is unchanged", async () => {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      const args = {
        p_egg_size_id: farmB.eggSizeId,
        p_price_per_egg: 8,
        p_price_per_tray: 240,
        p_effective_from: tomorrow,
      };

      // Correcting a price the same day must not stack a second row, and must
      // not trip the range check by closing a row before its own start.
      const { data: id, error } = await bob.client.rpc("set_egg_price", args);
      expect(error).toBeNull();

      const admin = adminClient();
      const { data: rows } = await admin
        .from("egg_prices")
        .select("id, price_per_tray")
        .eq("egg_size_id", farmB.eggSizeId)
        .eq("effective_from", tomorrow);

      expect(rows?.length).toBe(1);
      expect(rows?.[0].id).toBe(id);
      expect(Number(rows?.[0].price_per_tray)).toBe(240);
    });

    it("does not rewrite prices already recorded on past sales", async () => {
      // The whole point of effective-dated pricing.
      const admin = adminClient();
      const { data: before } = await admin
        .from("egg_sale_items")
        .select("price_per_tray, subtotal")
        .eq("egg_size_id", farmB.eggSizeId);

      await bob.client.rpc("set_egg_price", {
        p_egg_size_id: farmB.eggSizeId,
        p_price_per_egg: 12,
        p_price_per_tray: 360,
        p_effective_from: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
      });

      const { data: after } = await admin
        .from("egg_sale_items")
        .select("price_per_tray, subtotal")
        .eq("egg_size_id", farmB.eggSizeId);

      expect(after).toEqual(before);
    });
  });

  describe("record_daily_production RPC", () => {
    it("refuses a flock belonging to another farm", async () => {
      const { error } = await bob.client.rpc("record_daily_production", {
        p_flock_id: farmA.flockId,
        p_production_date: new Date().toISOString().slice(0, 10),
        p_hens_present: 10,
        p_eggs_collected: 10,
      });

      expect(error).not.toBeNull();
    });

    it("refuses an egg size belonging to another farm", async () => {
      // The cross-tenant hole this RPC exists to close: RLS on the child table
      // only checks the parent production row, not the egg_size_id it carries.
      const { error } = await bob.client.rpc("record_daily_production", {
        p_flock_id: farmB.flockId,
        p_production_date: new Date().toISOString().slice(0, 10),
        p_hens_present: 100,
        p_eggs_collected: 50,
        p_sizes: [{ egg_size_id: farmA.eggSizeId, quantity: 50 }],
      });

      expect(error).not.toBeNull();
    });

    it("accepts a farm's own flock and sizes", async () => {
      const { data, error } = await bob.client.rpc("record_daily_production", {
        p_flock_id: farmB.flockId,
        p_production_date: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
        p_hens_present: 500,
        p_eggs_collected: 300,
        p_sizes: [{ egg_size_id: farmB.eggSizeId, quantity: 300 }],
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it("rejects a breakdown larger than the eggs collected", async () => {
      const { error } = await bob.client.rpc("record_daily_production", {
        p_flock_id: farmB.flockId,
        p_production_date: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
        p_hens_present: 500,
        p_eggs_collected: 100,
        p_sizes: [{ egg_size_id: farmB.eggSizeId, quantity: 500 }],
      });

      expect(error).not.toBeNull();
    });

    it("is idempotent, so an offline retry cannot create a second day", async () => {
      const date = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
      const args = {
        p_flock_id: farmB.flockId,
        p_production_date: date,
        p_hens_present: 500,
        p_eggs_collected: 250,
      };

      const first = await bob.client.rpc("record_daily_production", args);
      const second = await bob.client.rpc("record_daily_production", args);

      expect(first.error).toBeNull();
      expect(second.error).toBeNull();
      expect(second.data).toBe(first.data);

      const { data } = await bob.client
        .from("daily_production")
        .select("id")
        .eq("flock_id", farmB.flockId)
        .eq("production_date", date);

      expect(data?.length).toBe(1);
    });
  });

  describe("record_egg_sale RPC", () => {
    const today = () => new Date().toISOString().slice(0, 10);

    async function availableFor(client: Client, farmId: string, eggSizeId: string) {
      const { data } = await client
        .from("egg_inventory_balances")
        .select("eggs_available")
        .eq("farm_id", farmId)
        .eq("egg_size_id", eggSizeId)
        .maybeSingle();
      return Number(data?.eggs_available ?? 0);
    }

    it("refuses a WORKER, who may record production but not sell", async () => {
      // The RPC is SECURITY INVOKER, so the caller's own policies decide. A
      // worker has no write policy on egg_sales and is refused here exactly as
      // they would be on a direct insert.
      const { error } = await worker.client.rpc("record_egg_sale", {
        p_sale_date: today(),
        p_items: [
          {
            egg_size_id: farmA.eggSizeId,
            quantity_trays: 1,
            quantity_eggs: 0,
            price_per_tray: 210,
            price_per_egg: 7,
          },
        ],
      });

      expect(error).not.toBeNull();
    });

    it("refuses an egg size belonging to another farm", async () => {
      // RLS checks the row's own farm_id and says nothing about which farm a
      // *referenced* row belongs to. The same class of hole has appeared twice
      // before, on the production breakdown and on inventory adjustments.
      const { error } = await bob.client.rpc("record_egg_sale", {
        p_sale_date: today(),
        p_items: [
          {
            egg_size_id: farmA.eggSizeId,
            quantity_trays: 1,
            quantity_eggs: 0,
            price_per_tray: 210,
            price_per_egg: 7,
          },
        ],
      });

      expect(error).not.toBeNull();
    });

    it("refuses a customer belonging to another farm", async () => {
      // A sale carries two cross-farm references, not one.
      const { error } = await bob.client.rpc("record_egg_sale", {
        p_sale_date: today(),
        p_customer_id: farmA.customerId,
        p_items: [
          {
            egg_size_id: farmB.eggSizeId,
            quantity_trays: 1,
            quantity_eggs: 0,
            price_per_tray: 210,
            price_per_egg: 7,
          },
        ],
      });

      expect(error).not.toBeNull();
    });

    it("computes the total and derives the status from the amount paid", async () => {
      const { data: saleId, error } = await bob.client.rpc("record_egg_sale", {
        p_sale_date: today(),
        p_customer_id: farmB.customerId,
        p_amount_paid: 500,
        p_items: [
          {
            egg_size_id: farmB.eggSizeId,
            quantity_trays: 2,
            quantity_eggs: 4,
            price_per_tray: 210,
            price_per_egg: 7,
          },
        ],
      });

      expect(error).toBeNull();

      const { data: sale } = await bob.client
        .from("egg_sales")
        .select("total_amount, amount_paid, payment_status")
        .eq("id", saleId as string)
        .single();

      // 2 * 210 + 4 * 7, computed server-side -- no total was sent.
      expect(Number(sale?.total_amount)).toBe(448);
      // Capped at the total: change handed back is not money the farm holds,
      // and recording more than the sale is worth makes every outstanding
      // figure nonsense.
      expect(Number(sale?.amount_paid)).toBe(448);
      expect(sale?.payment_status).toBe("PAID");
    });

    it("records an unpaid sale as UNPAID, so it can be chased", async () => {
      const { data: saleId, error } = await bob.client.rpc("record_egg_sale", {
        p_sale_date: today(),
        p_amount_paid: 0,
        p_items: [
          {
            egg_size_id: farmB.eggSizeId,
            quantity_trays: 1,
            quantity_eggs: 0,
            price_per_tray: 210,
            price_per_egg: 7,
          },
        ],
      });

      expect(error).toBeNull();

      const { data: sale } = await bob.client
        .from("egg_sales")
        .select("payment_status, amount_paid")
        .eq("id", saleId as string)
        .single();

      expect(sale?.payment_status).toBe("UNPAID");
      expect(Number(sale?.amount_paid)).toBe(0);
    });

    it("rejects PAID with nothing actually paid", async () => {
      // The database, not only the app, refuses a status that contradicts the
      // amount -- otherwise "who owes me money" is quietly a lie.
      const { error } = await bob.client.from("egg_sales").insert({
        farm_id: farmB.farmId,
        sale_date: today(),
        total_amount: 100,
        amount_paid: 0,
        payment_status: "PAID",
      });

      expect(error).not.toBeNull();
    });

    it("rejects PARTIAL that covers the whole total", async () => {
      const { error } = await bob.client.from("egg_sales").insert({
        farm_id: farmB.farmId,
        sale_date: today(),
        total_amount: 100,
        amount_paid: 100,
        payment_status: "PARTIAL",
      });

      expect(error).not.toBeNull();
    });

    it("takes the eggs sold out of the inventory balance", async () => {
      const before = await availableFor(bob.client, farmB.farmId, farmB.eggSizeId);

      const { error } = await bob.client.rpc("record_egg_sale", {
        p_sale_date: today(),
        p_amount_paid: 210,
        p_items: [
          {
            egg_size_id: farmB.eggSizeId,
            quantity_trays: 1,
            quantity_eggs: 5,
            price_per_tray: 210,
            price_per_egg: 7,
          },
        ],
      });

      expect(error).toBeNull();

      const after = await availableFor(bob.client, farmB.farmId, farmB.eggSizeId);
      expect(after).toBe(before - 35);
    });

    it("saves a sale larger than the stock on hand, leaving it negative", async () => {
      // Farms sell before recording the morning collection. Refusing would
      // make the app wrong about reality; the shortfall is shown, not hidden.
      const { error } = await bob.client.rpc("record_egg_sale", {
        p_sale_date: today(),
        p_amount_paid: 0,
        p_items: [
          {
            egg_size_id: farmB.eggSizeId,
            quantity_trays: 1000,
            quantity_eggs: 0,
            price_per_tray: 210,
            price_per_egg: 7,
          },
        ],
      });

      expect(error).toBeNull();
      expect(await availableFor(bob.client, farmB.farmId, farmB.eggSizeId)).toBeLessThan(0);
    });
  });
});
