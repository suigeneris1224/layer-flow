import "server-only";

import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/config/env";

export { REMEMBER_ME_COOKIE } from "@/lib/supabase/cookies";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Anon key + session cookie, so every query is RLS-checked -- see `admin.ts`
 * for the rare exceptions.
 *
 * `persistSession: false` implements "Remember me" unchecked by stripping
 * `maxAge`/`expires` from the cookie; `REMEMBER_ME_COOKIE` lets
 * `lib/supabase/middleware.ts` keep stripping it on later requests too.
 *
 * Wrapped in React `cache()` so one request shares one client instead of
 * each `lib/data/*.ts` call creating its own -- otherwise parallel queries
 * with an expired token would race to refresh it with the same refresh
 * token, and all but the first fail ("Invalid Refresh Token: Already Used").
 */
export const createSupabaseServerClient = cache(
  async (options?: { persistSession?: boolean }) => {
    const persistSession = options?.persistSession ?? true;
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
              for (const { name, value, options: cookieOptions } of cookiesToSet) {
                const finalOptions = { ...cookieOptions };
                if (!persistSession) {
                  delete finalOptions.maxAge;
                  delete finalOptions.expires;
                }
                cookieStore.set(name, value, finalOptions);
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
);
