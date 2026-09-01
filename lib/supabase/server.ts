import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/config/env";

export { REMEMBER_ME_COOKIE } from "@/lib/supabase/cookies";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the anon key and the caller's session cookie, so every query it makes
 * is subject to RLS. This is the client that should be used for essentially
 * all application code -- see `admin.ts` for the rare exceptions.
 *
 * `persistSession: false` is "Remember me" unchecked at sign-in: Supabase's
 * own cookie options already carry a long `maxAge` (the session survives a
 * closed browser), so to make a login session-only we strip `maxAge`/
 * `expires` from what it asks us to set, which turns the cookie into a
 * browser-session cookie instead. Every other caller keeps the default.
 *
 * This alone only covers the sign-in request: `lib/supabase/middleware.ts`
 * revalidates the token on every subsequent request and would otherwise
 * rewrite the cookie with Supabase's default (persistent) options on the very
 * next navigation, silently undoing the choice. `REMEMBER_ME_COOKIE` is how
 * that later, stateless request knows to keep stripping it too.
 */
export async function createSupabaseServerClient(options?: { persistSession?: boolean }) {
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
