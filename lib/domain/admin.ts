/**
 * Pure search/pagination for the platform-admin farm list (app/admin/).
 *
 * Deliberately generic and I/O-free: the page always fetches every farm
 * first (lib/data/admin.ts's getAllSubscriptions has no limit -- the stats
 * panel needs the full set regardless of what's searched or paginated), then
 * filters here before paginating. That ordering is what makes search reach
 * every farm rather than just the current page: filtering always runs
 * against the complete list, and pagination only slices what's left after.
 */

export const ADMIN_PAGE_SIZE = 20;

export interface SearchableFarm {
  farmName: string;
  ownerEmail: string | null;
}

/** Case-insensitive substring match against farm name or owner email. Empty query matches everything. */
export function searchFarms<T extends SearchableFarm>(
  rows: readonly T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];

  return rows.filter(
    (row) =>
      row.farmName.toLowerCase().includes(q) ||
      (row.ownerEmail?.toLowerCase().includes(q) ?? false)
  );
}

export interface PaginatedResult<T> {
  items: T[];
  /** Clamped into [1, totalPages] -- an out-of-range request (stale link, hand-edited URL) never errors. */
  page: number;
  totalPages: number;
  totalItems: number;
}

export function paginate<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number
): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages);
  const start = (page - 1) * pageSize;

  return { items: items.slice(start, start + pageSize), page, totalPages, totalItems };
}
