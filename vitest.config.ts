import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // The RLS suite needs a live database. It runs via `npm run test:rls`.
    exclude: ["tests/rls/**"],
    // Dummy values so importing lib/config/env.ts (its public schema parses
    // eagerly at module load) doesn't crash a unit test that never actually
    // talks to Supabase -- e.g. tests/email-client.test.ts, which only needs
    // the lazy serverEnv getters it pulls in transitively.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // See tests/stubs/server-only.ts -- the real package isn't installed;
      // Next.js resolves it internally, Vitest doesn't.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
