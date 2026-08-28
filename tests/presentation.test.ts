import { describe, expect, it } from "vitest";
import { greetingFor, describeActivity, flockStatusLine } from "@/lib/domain/presentation";

describe("greetingFor", () => {
  it("greets morning before noon", () => {
    expect(greetingFor(5)).toBe("Good morning");
    expect(greetingFor(11)).toBe("Good morning");
  });

  it("greets afternoon from noon", () => {
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(17)).toBe("Good afternoon");
  });

  it("greets evening from six", () => {
    expect(greetingFor(18)).toBe("Good evening");
    expect(greetingFor(23)).toBe("Good evening");
  });

  it("treats the small hours as morning, not evening", () => {
    // Farmers start before dawn; 4am is the start of the working day.
    expect(greetingFor(0)).toBe("Good morning");
    expect(greetingFor(4)).toBe("Good morning");
  });

  it("never returns an empty string for an out-of-range hour", () => {
    expect(greetingFor(-1).length).toBeGreaterThan(0);
    expect(greetingFor(99).length).toBeGreaterThan(0);
  });
});

describe("describeActivity", () => {
  it("describes a production record", () => {
    const line = describeActivity({
      action: "production.recorded",
      metadata: { eggs: 820 },
    });
    expect(line.title).toMatch(/production/i);
    expect(line.detail).toContain("820");
  });

  it("describes a sale with its amount", () => {
    const line = describeActivity({
      action: "sale.recorded",
      metadata: { total: 3330 },
    });
    expect(line.title).toMatch(/sold|sale/i);
    expect(line.detail).toContain("3,330");
  });

  it("describes a stock adjustment with size and direction", () => {
    const line = describeActivity({
      action: "inventory.adjusted",
      metadata: { sizeName: "Large", quantityEggs: -20 },
    });
    expect(line.detail).toContain("Large");
    expect(line.detail).toContain("20");
  });

  it("describes a price change", () => {
    const line = describeActivity({
      action: "egg_prices.updated",
      metadata: { pricePerTray: 220 },
    });
    expect(line.title).toMatch(/price/i);
  });

  it("falls back readably for an action it does not know", () => {
    const line = describeActivity({ action: "something.new", metadata: null });
    expect(line.title.length).toBeGreaterThan(0);
    // Never leak a raw dotted action string at the user.
    expect(line.title).not.toContain("something.new");
  });

  it("survives missing or malformed metadata", () => {
    expect(describeActivity({ action: "production.recorded", metadata: null }).title).toBeTruthy();
    expect(
      describeActivity({ action: "sale.recorded", metadata: { total: "oops" } }).title
    ).toBeTruthy();
  });
});

describe("flockStatusLine", () => {
  /*
   * This replaces a "Flock Health: Excellent / No health issues detected"
   * card. LayerFlow observes mortality numbers; it cannot determine health,
   * and must never imply it can (spec section 28).
   */
  it("never claims a health status", () => {
    const forbidden = ["health", "healthy", "disease", "excellent", "diagnos"];
    for (const deaths of [0, 2, 40]) {
      const line = flockStatusLine(deaths, 1000);
      const text = `${line.headline} ${line.detail}`.toLowerCase();
      for (const word of forbidden) expect(text).not.toContain(word);
    }
  });

  it("reports a normal week factually", () => {
    const line = flockStatusLine(2, 1000);
    expect(line.tone).toBe("good");
    expect(line.detail).toContain("2");
  });

  it("flags mortality above the normal range", () => {
    const line = flockStatusLine(40, 1000);
    expect(line.tone).toBe("bad");
  });

  it("says so plainly when nothing was lost", () => {
    const line = flockStatusLine(0, 1000);
    expect(line.tone).toBe("good");
    expect(line.detail).toMatch(/no birds lost/i);
  });

  it("does not divide by zero on an empty farm", () => {
    const line = flockStatusLine(0, 0);
    expect(line.headline.length).toBeGreaterThan(0);
  });
});
