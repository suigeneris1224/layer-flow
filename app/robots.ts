import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/config/env";

/**
 * Allowlist, not a disallow-list: everything is blocked by default, only the
 * fixed set of real public pages is explicitly allowed -- a new route added
 * later defaults to blocked until someone deliberately allows it here, the
 * safer default. `/$` (not `/`) allows only the exact homepage; a bare `/`
 * would match every path as a prefix and defeat the blanket disallow.
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
