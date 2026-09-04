import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext config for the Cloudflare adapter.
 *
 * No incremental-cache override needed: the app has no ISR/`revalidateTag`
 * usage (every page under app/(app)/ is `force-dynamic`, and every cache
 * invalidation is a Server Action calling `revalidatePath`), so the default
 * in-memory-per-request cache is enough -- there is nothing durable to warm
 * or persist across requests.
 */
export default defineCloudflareConfig();
