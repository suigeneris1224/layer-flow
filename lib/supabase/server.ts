import "server-only";

import { cache } from "react";
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
 *
 * Wrapped in React `cache()` so every call within one request's render --
 * and every `lib/data/*.ts` function does call this independently -- shares
 * one client instance instead of creating a new one each time. That matters
 * beyond avoiding redundant work: Supabase rotates refresh tokens on every
 * use (the old one is invalidated the moment a new one is issued). Without
 * this memoization, a page that fans out N parallel data queries via
 * Promise.all would create N independent clients, and if the access token
 * was expired when the request started, each one would race to refresh with
 * the *same* refresh token -- only the first wins, the rest fail with
 * "Invalid Refresh Token: Already Used". One shared client means at most one
 * in-flight refresh per request, not N racing ones.
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
