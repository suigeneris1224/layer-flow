import { describe, expect, it } from "vitest";
import { exportFilename, slugify } from "@/lib/export/filename";

describe("slugify", () => {
  it("lowercases and hyphenates a farm name", () => {
    expect(slugify("San Remigio Egg Farm")).toBe("san-remigio-egg-farm");
  });

  it("strips diacritics rather than dropping the letter", () => {
    expect(slugify("Muñoz Poultry")).toBe("munoz-poultry");
    expect(slugify("Bañez")).toBe("banez");
  });

  it("collapses runs of punctuation and trims the edges", () => {
    expect(slugify("  --Santos & Sons!!  ")).toBe("santos-sons");
  });

  it("falls back to 'farm' when nothing survives", () => {
    expect(slugify("🐔🥚")).toBe("farm");
    expect(slugify("   ")).toBe("farm");
  });

  it("caps the length without leaving a trailing hyphen", () => {
    const slug = slugify("a".repeat(30) + " " + "b".repeat(30));
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("exportFilename", () => {
  it("names the dataset, the farm and the window", () => {
    expect(
      exportFilename({
        dataset: "sales",
        farmName: "San Remigio Egg Farm",
        from: "2026-01-01",
        to: "2026-08-31",
      })
    ).toBe("layerflow-sales-san-remigio-egg-farm-2026-01-01_to_2026-08-31.csv");
  });

  it("uses the 'all' form for an unbounded range", () => {
    expect(
      exportFilename({ dataset: "expenses", farmName: "Demo", from: null, to: "2026-08-31" })
    ).toBe("layerflow-expenses-demo-all-2026-08-31.csv");
  });

  /*
   * Not cosmetic. An ASCII-only filename is what lets Content-Disposition use
   * a plain filename="..." with no chance of a quote or newline reaching the
   * header.
   */
  it("is always safe to interpolate into a header", () => {
    const hostile = 'Farm" ; drop\r\nX-Evil: 1';
    const name = exportFilename({
      dataset: "sales",
      farmName: hostile,
      from: null,
      to: "2026-08-31",
    });
    expect(name).toMatch(/^[A-Za-z0-9._-]+\.csv$/);
  });
});
