/**
 * Reading a whole dataset out of a paged source.
 *
 * PostgREST caps how many rows one request may return (1000 by default), so an
 * export covering years has to loop. Generic over an injected fetcher so the
 * loop itself is testable without a database.
 */

export interface PaginateOptions {
  /**
   * Deliberately below any plausible PostgREST `max-rows`. At exactly the cap,
   * "a short page means we are done" stops being distinguishable from "the
   * server truncated us", and the loop would stop early and call it success.
   */
  pageSize: number;
  /** Refuse rather than assemble a file nobody can open. */
  hardCap: number;
}

export const EXPORT_PAGE_SIZE = 500;
export const EXPORT_HARD_CAP = 20_000;

export async function fetchAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<T[]>,
  options: PaginateOptions = { pageSize: EXPORT_PAGE_SIZE, hardCap: EXPORT_HARD_CAP }
): Promise<T[]> {
  const all: T[] = [];

  for (let offset = 0; offset < options.hardCap; offset += options.pageSize) {
    const limit = Math.min(options.pageSize, options.hardCap - offset);
    const page = await fetchPage(offset, limit);
    all.push(...page);

    // A short page is the end of the data.
    //
    // It is also what a failed query looks like, because the data layer logs
    // and returns [] rather than throwing. That ambiguity is real and is not
    // solvable here -- the caller reconciles this length against a separate
    // count query, and refuses to serve a file when the two disagree.
    if (page.length < limit) break;
  }

  return all;
}
