import type { NextConfig } from "next";

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
        // Content-Security-Policy is set in middleware.ts instead -- it
        // needs a fresh nonce per request, which a static header list here
        // can never provide. Setting it here too would add a second CSP
        // header that browsers combine restrictively, re-enforcing the old
        // static policy on top of the nonce'd one.
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // 2 years, scoped to subdomains of this exact host only -- not
          // `preload` yet, since submitting to the browser preload list is
          // effectively permanent and deserves its own explicit decision.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }
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
