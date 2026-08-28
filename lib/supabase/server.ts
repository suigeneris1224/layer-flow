import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/config/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the anon key and the caller's session cookie, so every query it makes
 * is subject to RLS. This is the client that should be used for essentially
 * all application code -- see `admin.ts` for the rare exceptions.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. The middleware refreshes
            // the session on every request, so it is safe to ignore here.
          }
        },
      },
    }
  );
}
