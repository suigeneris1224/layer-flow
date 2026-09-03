import { describe, expect, it } from "vitest";
import { searchFarms, paginate, ADMIN_PAGE_SIZE } from "@/lib/domain/admin";

interface Farm {
  farmName: string;
  ownerEmail: string | null;
}

const farms: Farm[] = [
  { farmName: "Sunrise Layers", ownerEmail: "juan@example.com" },
  { farmName: "Golden Egg Farm", ownerEmail: "maria@delacruz.ph" },
  { farmName: "Bantay Poultry", ownerEmail: null },
];

describe("searchFarms", () => {
  it("returns every row when the query is empty", () => {
    expect(searchFarms(farms, "")).toEqual(farms);
    expect(searchFarms(farms, "   ")).toEqual(farms);
  });

  it("matches by farm name, case-insensitively", () => {
    expect(searchFarms(farms, "golden")).toEqual([farms[1]]);
    expect(searchFarms(farms, "SUNRISE")).toEqual([farms[0]]);
  });

  it("matches by owner email, case-insensitively", () => {
    expect(searchFarms(farms, "delacruz")).toEqual([farms[1]]);
    expect(searchFarms(farms, "JUAN@EXAMPLE.COM")).toEqual([farms[0]]);
  });

  it("does not throw on a farm with a null owner email", () => {
    expect(searchFarms(farms, "bantay")).toEqual([farms[2]]);
    expect(searchFarms(farms, "nomatch")).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const copy = [...farms];
    searchFarms(farms, "golden");
    expect(farms).toEqual(copy);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1);

  it("caps each page at pageSize", () => {
    const result = paginate(items, 1, ADMIN_PAGE_SIZE);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.totalItems).toBe(45);
  });

  it("returns the correct slice for a middle page", () => {
    const result = paginate(items, 2, ADMIN_PAGE_SIZE);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toBe(21);
  });

  it("returns a partial final page", () => {
    const result = paginate(items, 3, ADMIN_PAGE_SIZE);
    expect(result.items).toHaveLength(5);
    expect(result.items[0]).toBe(41);
  });

  it("clamps a page number below 1", () => {
    const result = paginate(items, 0, ADMIN_PAGE_SIZE);
    expect(result.page).toBe(1);
  });

  it("clamps a page number past the last page", () => {
    const result = paginate(items, 99, ADMIN_PAGE_SIZE);
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(5);
  });

  it("clamps a NaN page number to 1", () => {
    const result = paginate(items, Number.NaN, ADMIN_PAGE_SIZE);
    expect(result.page).toBe(1);
  });

  it("handles an empty list as a single empty page", () => {
    const result = paginate([], 1, ADMIN_PAGE_SIZE);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });
});
