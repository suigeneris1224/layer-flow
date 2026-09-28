/**
 * Content-Security-Policy builder.
 *
 * Lives here (not next.config.ts) because a nonce can only be generated per
 * request -- next.config.ts's headers() config is static and evaluated once
 * at build time, so it can never vary the nonce. middleware.ts calls this
 * with a fresh nonce on every request and sets the result as the response's
 * Content-Security-Policy header.
 */

/*
 * Built from NEXT_PUBLIC_SUPABASE_URL directly (not lib/config/env.ts's
 * zod-validated publicEnv) so this file has no import-time dependency on
 * other env vars it doesn't need. Every REST/Auth/Storage call and every
 * farm/avatar/cover photo the app renders comes from this one origin, so it
 * is the only third party this CSP has to allow.
 */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");

/**
 * `script-src` uses a per-request nonce instead of `'unsafe-inline'` -- Next
 * applies it automatically to its own hydration scripts, and nothing else
 * here renders inline JS. `'unsafe-eval'` is dev-only: Fast Refresh's source
 * maps need it, production builds don't.
 *
 * `style-src` still carries `'unsafe-inline'`: several components set
 * genuinely dynamic inline styles (chart colors, an animation delay, a
 * data-driven bar width) that a nonce can't cover -- known gap, not yet
 * closed, tracked separately.
 *
 * `blob:` on img-src is for the client-side photo crop/resize preview
 * (`URL.createObjectURL`) before anything is uploaded.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
