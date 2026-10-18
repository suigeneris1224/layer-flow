import { getPublicStats } from "@/lib/data/public-stats";
import { shouldShowStats } from "@/lib/domain/public-stats";

/**
 * The homepage's usage totals (components/marketing/usage-stats.tsx).
 *
 * The homepage stays static, so the numbers come from here. Cached for an
 * hour in Cloudflare's edge cache (the Workers Cache API -- OpenNext has no
 * persistent cache configured), so this costs about one database call per
 * hour per location however often it's hit. Below the threshold it answers
 * `{ show: false }` and never reveals the small numbers.
 */
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600";

/** Cloudflare's default edge cache; absent in `next dev` and Node. */
function edgeCache(): Cache | null {
  const store = (globalThis as { caches?: { default?: Cache } }).caches;
  return store?.default ?? null;
}

export async function GET(request: Request) {
  const cache = edgeCache();
  // One key for every caller: query strings can't be used to bypass the cache.
  const key = new Request(new URL("/api/public-stats", request.url).toString());

  if (cache) {
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) return hit;
  }

  const stats = await getPublicStats();
  const body = shouldShowStats(stats) ? { show: true, ...stats } : { show: false };
  const response = Response.json(body, { headers: { "Cache-Control": CACHE_CONTROL } });

  // A failed lookup isn't cached, so the next request tries again.
  if (cache && stats !== null) {
    await cache.put(key, response.clone()).catch(() => undefined);
  }
  return response;
}
