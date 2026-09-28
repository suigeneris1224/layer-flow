/**
 * Marks a signed-in session as "Remember me" unchecked at login.
 *
 * Session-scoped itself (no maxAge), so it disappears with the rest of the
 * browser session it describes. Shared, `server-only`-free module: both
 * `lib/supabase/server.ts` (Server Components/Actions, Node runtime) and
 * `lib/supabase/middleware.ts` (Edge runtime) need this same string.
 */
export const REMEMBER_ME_COOKIE = "lf_remember_off";

/**
 * `"<farmId>:<epochMs>"` marker of when `lib/data/dashboard.ts`'s
 * `syncFarmAlerts` last actually ran for the active farm. Written by
 * `lib/supabase/middleware.ts` (a Server Component like `app/(app)/layout.tsx`
 * cannot set cookies mid-render -- see that file's own try/catch around
 * `cookies().set()`), read by that same middleware on the next request to
 * decide whether the full alert sync is due again or can be skipped.
 */
export const ALERT_SYNC_COOKIE = "lf_alerts_synced_at";
