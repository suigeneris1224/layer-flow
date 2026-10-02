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
        "/docs",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        // Not pages, but the blanket disallow above catches them too. Google
        // must fetch the sitemap, and the CSS/JS/images a page needs to
        // render -- blocking these made Search Console reject the sitemap
        // ("General HTTP error") and the indexing requests.
        "/sitemap.xml",
        "/_next/static/",
        "/_next/image",
        "/icons/",
        "/opengraph-image.png",
        "/twitter-image.png",
        "/manifest.webmanifest",
      ],
    },
    sitemap: `${publicEnv.appUrl}/sitemap.xml`,
  };
}
