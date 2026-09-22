import "server-only";

/**
 * Shared cache-tag helpers for `unstable_cache`-backed data readers.
 *
 * One tag per farm, covering every table a farm-scoped report/analytics
 * reader depends on (daily_production, egg_sales, expenses, feed_usage,
 * daily_egg_size_production -- egg_grading_summary/egg_inventory_balances
 * are views over the first two, not separately-written tables). Every write
 * site to those tables must call `revalidateTag(farmDataTag(farmId))`
 * alongside its existing `revalidatePath` calls, or a cached reader will
 * keep serving stale numbers for that farm indefinitely.
 */
export function farmDataTag(farmId: string): string {
  return `farm-data:${farmId}`;
}
