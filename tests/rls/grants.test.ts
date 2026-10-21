import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  cleanup,
  createTestUser,
  isSupabaseReachable,
  type Client,
  type TestUser,
} from "./helpers";

/**
 * Table grants, checked for every table and view in `public`.
 *
 * From 30 Oct 2026 Supabase no longer grants the API roles access to new
 * public tables by default. Ours have so far relied on the default
 * privileges set in 20250101000600_grants.sql; if those stop applying -- on
 * a fresh `db reset`, a preview branch, or a new table -- the table is
 * unreachable and the app gets "permission denied" in production. This
 * catches it locally first.
 *
 * Grants decide whether a role may touch a table at all; RLS decides which
 * rows. Isolation is proven in isolation.test.ts -- here only the first part.
 *
 * The table list comes from lib/types/database.generated.ts, so a new table
 * is covered as soon as `npm run db:types` has run. New table migrations
 * should carry their own `grant` lines (see docs/database.md).
 */

const reachable = await isSupabaseReachable();
const suite = reachable ? describe : describe.skip;

/** Postgres "insufficient_privilege", as PostgREST reports a missing grant. */
const PERMISSION_DENIED = "42501";

/** Tables `authenticated` deliberately can't read at all (server-only). */
const NO_USER_SELECT = new Set(["email_events", "rate_limit_hits"]);

/** Every table and view under `public` in the generated types. */
function publicRelations(): string[] {
  const source = readFileSync(
    path.resolve(__dirname, "../../lib/types/database.generated.ts"),
    "utf8"
  );
  const start = source.indexOf("    Tables: {");
  const end = source.indexOf("    Functions: {", start);
  const names = [...source.slice(start, end).matchAll(/^ {6}([a-z_][a-z0-9_]*): \{$/gm)].map(
    (match) => match[1]
  );
  return [...new Set(names)].sort();
}

async function selectError(client: Client, relation: string): Promise<string | null> {
  // limit(0): no rows come back, so this is cheap and doesn't depend on
  // fixtures. Not `head: true` -- a HEAD response has no body, so the error
  // code never arrives and denied looks the same as allowed.
  const { error } = await client.from(relation as never).select("*").limit(0);
  return error?.code ?? null;
}

suite("Table grants", () => {
  const relations = publicRelations();
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser("grants");
  }, 60_000);

  afterAll(async () => {
    await cleanup([user.id]);
  }, 60_000);

  it("finds the tables to check", () => {
    // Guards against the parser silently matching nothing.
    expect(relations.length).toBeGreaterThan(30);
    expect(relations).toContain("farms");
    expect(relations).toContain("weather_snapshots");
  });

  it("service_role can reach every table", async () => {
    const admin = adminClient();
    const denied: string[] = [];
    for (const relation of relations) {
      if ((await selectError(admin, relation)) === PERMISSION_DENIED) denied.push(relation);
    }
    expect(denied, "missing grant to service_role").toEqual([]);
  });

  it("signed-in users can reach every table except the server-only ones", async () => {
    const denied: string[] = [];
    const unexpectedlyOpen: string[] = [];
    for (const relation of relations) {
      const isDenied = (await selectError(user.client, relation)) === PERMISSION_DENIED;
      if (NO_USER_SELECT.has(relation)) {
        if (!isDenied) unexpectedlyOpen.push(relation);
      } else if (isDenied) {
        denied.push(relation);
      }
    }
    expect(denied, "missing grant to authenticated").toEqual([]);
    expect(unexpectedlyOpen, "server-only table readable by authenticated").toEqual([]);
  });

  it("anon can reach no table", async () => {
    const anon = anonClient();
    const open: string[] = [];
    for (const relation of relations) {
      if ((await selectError(anon, relation)) !== PERMISSION_DENIED) open.push(relation);
    }
    expect(open, "table reachable by anon").toEqual([]);
  });
});
