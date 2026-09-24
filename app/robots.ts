import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/config/env";

/**
 * Allowlist, not a disallow-list: everything is blocked by default, and only
 * the small, fixed set of real public pages is explicitly allowed. Mirrors
 * `PUBLIC_PATHS` in lib/supabase/middleware.ts, which is the one source of
 * truth for what doesn't require a session -- narrowed further here to just
 * the actual content pages, since login/signup/reset forms have nothing
 * worth ranking and functional endpoints (/auth/callback, /auth/confirm,
 * /api/*, /invite/[token]) must never be indexed at all.
 *
 * A new route added later defaults to blocked until someone deliberately
 * allows it here -- the safer default, versus a disallow-list that silently
 * exposes anything new.
 *
 * `/$` (not `/`) allows only the exact homepage; a bare `/` would match
 * every path as a prefix and defeat the blanket disallow. Google and Bing
 * both support this `$` end-anchor and the "most specific rule wins" tie-break.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
      allow: [
        "/$",
        "/pricing",
        "/features",
        "/how-it-works",
        "/faq",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${publicEnv.appUrl}/sitemap.xml`,
  };
}
