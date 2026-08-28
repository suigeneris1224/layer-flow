import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * RLS suite: needs a running local Supabase, so it is kept out of the default
 * `npm test` run. Unit tests must stay runnable without Docker.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    // Fixtures are shared and the suite asserts on database state, so parallel
    // files would race each other.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
