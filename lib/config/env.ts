import { z } from "zod";

/**
 * Environment access, validated once at module load.
 *
 * Splitting public from server config is deliberate: `serverEnv` reads the
 * service-role key, and importing it from a Client Component is a build error
 * rather than a silent secret leak.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

// Next.js inlines NEXT_PUBLIC_* only for literal property reads, so these
// cannot be looped over dynamically.
const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsedPublic.success) {
  const detail = parsedPublic.error.issues.map((i) => `  - ${i.message}`).join("\n");
  throw new Error(
    `LayerFlow is missing required environment variables:\n${detail}\n\n` +
      `Copy .env.example to .env.local and fill it in. Run \`supabase start\` ` +
      `to get your local URL and anon key.`
  );
}

export const publicEnv = {
  supabaseUrl: parsedPublic.data.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: parsedPublic.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  appUrl: parsedPublic.data.NEXT_PUBLIC_APP_URL,
} as const;

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Server-only configuration. Never import this into a Client Component.
 *
 * Read lazily so that a missing service-role key only breaks the specific
 * server path that needs it, rather than the whole app at boot.
 */
export const serverEnv = {
  get serviceRoleKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set. It is required for admin-only " +
          "operations and must never be exposed to the browser."
      );
    }
    return key;
  },
  get storageBucket(): string {
    return process.env.STORAGE_BUCKET ?? "layerflow";
  },
  get billingProvider(): string {
    return process.env.BILLING_PROVIDER ?? "mock";
  },
} as const;
