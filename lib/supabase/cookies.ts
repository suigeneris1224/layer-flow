/**
 * Marks a signed-in session as "Remember me" unchecked at login.
 *
 * Session-scoped itself (no maxAge), so it disappears with the rest of the
 * browser session it describes. Shared, `server-only`-free module: both
 * `lib/supabase/server.ts` (Server Components/Actions, Node runtime) and
 * `lib/supabase/middleware.ts` (Edge runtime) need this same string.
 */
export const REMEMBER_ME_COOKIE = "lf_remember_off";
