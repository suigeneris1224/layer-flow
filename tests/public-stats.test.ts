import { describe, expect, it } from "vitest";
import { MIN_FARMS, compactCount, shouldShowStats } from "@/lib/domain/public-stats";

const stats = (farms: number) => ({ farms, eggs: 1_000, hens: 500, provinces: 1 });

describe("shouldShowStats", () => {
  it("stays hidden below the farm threshold and when the lookup failed", () => {
    expect(shouldShowStats(null)).toBe(false);
    expect(shouldShowStats(stats(0))).toBe(false);
    expect(shouldShowStats(stats(MIN_FARMS - 1))).toBe(false);
  });

  it("shows from the threshold up", () => {
    expect(shouldShowStats(stats(MIN_FARMS))).toBe(true);
    expect(shouldShowStats(stats(250))).toBe(true);
  });
});

describe("compactCount", () => {
  it("writes small numbers exactly", () => {
    expect(compactCount(0)).toBe("0");
    expect(compactCount(999)).toBe("999");
    expect(compactCount(12_400)).toBe("12,400");
    expect(compactCount(99_999)).toBe("99,999");
  });

  it("shortens big numbers and always rounds down", () => {
    expect(compactCount(100_000)).toBe("100K+");
    expect(compactCount(350_999)).toBe("350K+");
    expect(compactCount(999_999)).toBe("999K+");
    expect(compactCount(1_000_000)).toBe("1M+");
    expect(compactCount(1_249_999)).toBe("1.2M+");
    expect(compactCount(1_299_999)).toBe("1.2M+");
    expect(compactCount(25_000_000)).toBe("25M+");
  });

  it("never shows a negative or fractional count", () => {
    expect(compactCount(-5)).toBe("0");
    expect(compactCount(12.9)).toBe("12");
  });
});
