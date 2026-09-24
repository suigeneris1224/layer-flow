import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/config/env";

/**
 * The 9 real content pages -- the ones worth ranking for, matching
 * app/robots.ts's allowlist minus the login/signup/reset-password forms
 * (public, but no unique content to prioritize).
 *
 * No `lastModified`: there's no CMS here, just static .tsx files, so there's
 * no real per-page modification date to report. Stamping every page with
 * `new Date()` on every build would misinform crawlers ("everything changed
 * today") rather than help them -- omitting it (it's optional) is more
 * honest than faking it.
 */
const CONTENT_PAGES: {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
}[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/features", priority: 0.8, changeFrequency: "monthly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return CONTENT_PAGES.map(({ path, priority, changeFrequency }) => ({
    url: `${publicEnv.appUrl}${path}`,
    changeFrequency,
    priority,
  }));
}
