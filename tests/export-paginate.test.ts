import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "@/lib/export/paginate";

/** A source of `total` sequential numbers, served in pages. */
function source(total: number) {
  return vi.fn(async (offset: number, limit: number) =>
    Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => offset + i)
  );
}

describe("fetchAllPages", () => {
  it("returns everything, in order, across several pages", async () => {
    const fetchPage = source(25);
    const rows = await fetchAllPages(fetchPage, { pageSize: 10, hardCap: 1000 });

    expect(rows).toHaveLength(25);
    expect(rows[0]).toBe(0);
    expect(rows[24]).toBe(24);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("stops on a short page without asking for another", async () => {
    const fetchPage = source(7);
    await fetchAllPages(fetchPage, { pageSize: 10, hardCap: 1000 });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("makes exactly one request when the data divides evenly, plus the confirming one", async () => {
    const fetchPage = source(20);
    const rows = await fetchAllPages(fetchPage, { pageSize: 10, hardCap: 1000 });
    expect(rows).toHaveLength(20);
    // Pages of 10, 10, then an empty third that proves there is no more.
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("never exceeds the hard cap", async () => {
    const rows = await fetchAllPages(source(1000), { pageSize: 10, hardCap: 25 });
    expect(rows).toHaveLength(25);
  });

  /*
   * The data layer logs and returns [] rather than throwing, so a failed query
   * mid-export is indistinguishable from the end of the data. This documents
   * that, and is why the route reconciles the row count against a separate
   * count query before serving a file.
   */
  it("cannot tell a failed page from the end of the data", async () => {
    const fetchPage = vi
      .fn(async (_offset: number, _limit: number): Promise<number[]> => [])
      .mockResolvedValueOnce([1, 2, 3])
      .mockResolvedValueOnce([]);

    const rows = await fetchAllPages(fetchPage, { pageSize: 3, hardCap: 100 });
    expect(rows).toEqual([1, 2, 3]);
  });
});
