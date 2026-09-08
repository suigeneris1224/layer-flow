import type { NextConfig } from "next";

/*
 * Built from NEXT_PUBLIC_SUPABASE_URL directly (not lib/config/env.ts's
 * zod-validated publicEnv) so this file has no import-time dependency on
 * other env vars next.config.ts itself doesn't need. Every REST/Auth/Storage
 * call and every farm/avatar/cover photo the app renders comes from this one
 * origin, so it is the only third party this CSP has to allow.
 */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");

// 'unsafe-inline' on script-src/style-src is a known, deliberate gap: Next's
// App Router injects its own inline hydration script, and at least one
// component (public-footer.tsx) sets CSS custom properties via a style
// attribute. Removing it needs a per-request nonce threaded through
// middleware into every layout -- real plumbing that wants a browser to
// verify hydration doesn't break, not a one-line follow-up. See
// docs/security.md.
//
// 'unsafe-eval' is dev-only: `next dev`'s Fast Refresh compiles chunks with
// eval()-based source maps, so any client component (the dashboard's charts
// are the obvious one) throws a CSP violation and fails to run without it.
// Production builds don't eval, so it's dropped there.
const scriptSrc = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${supabaseOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /*
   * `next build` and `next dev` share `.next` by default, so building while a
   * dev server is running silently corrupts it -- the page keeps serving but
   * its stylesheet 404s, and the app renders completely unstyled.
   *
   * `npm run build:check` sets NEXT_DIST_DIR so a verification build never
   * touches a running dev server's output.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }
        ]
      },
      {
        // The service worker's own versioned Cache Storage handles staleness
        // of what IT caches -- this handles staleness of sw.js itself, so an
        // updated worker isn't held back by ordinary HTTP caching.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }
        ]
      }
    ];
  }
};

export default nextConfig;
