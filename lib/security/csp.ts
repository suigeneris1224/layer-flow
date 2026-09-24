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
 * `script-src` uses a per-request nonce instead of `'unsafe-inline'` --
 * Next.js detects the nonce in this header and applies it automatically to
 * its own inline hydration/RSC bootstrap scripts, and nothing else in this
 * codebase renders a custom inline `<script>` or `dangerouslySetInnerHTML`
 * (verified by grep), so nothing else needs to read or forward the nonce.
 * `'unsafe-eval'` stays dev-only: `next dev`'s Fast Refresh compiles chunks
 * with eval()-based source maps, so any client component (the dashboard's
 * charts are the obvious one) throws a CSP violation and fails to run
 * without it. Production builds don't eval, so it's dropped there.
 *
 * `style-src` still carries `'unsafe-inline'`. Several components set
 * genuinely dynamic inline styles -- chart palette colors cycling a fixed
 * array, a staggered animation delay, a data-driven container height, and
 * an inventory bar's continuous 0-100% width (components/nav/quick-add.tsx,
 * components/charts/expense-category-chart.tsx, egg-size-donut.tsx,
 * egg-size-trend-chart.tsx, components/dashboard/inventory-panel.tsx). A CSS
 * nonce only exempts `<style>` elements, never a bare `style=""` attribute,
 * so removing this needs each call site converted to a bounded set of
 * static classes or a per-element nonce'd `<style>` tag -- real, separate
 * work, deliberately not bundled into this pass.
 *
 * `blob:` on img-src is for the client-only photo crop/resize pipeline
 * (lib/client/resize-image.ts, components/ui/image-crop-modal.tsx) -- it
 * previews a picked file via `URL.createObjectURL(file)` before anything is
 * ever uploaded, and without `blob:` here the browser silently refuses to
 * load it: the <img>'s onerror fires exactly like a real decode failure, and
 * there's no network request for either end's logs to ever show.
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
