import { describe, expect, it } from "vitest";
import { slugifyEggSizeCode } from "@/lib/domain/egg-sizes";

describe("slugifyEggSizeCode", () => {
  it("uppercases a simple name", () => {
    expect(slugifyEggSizeCode("Small")).toBe("SMALL");
  });

  it("replaces spaces with underscores", () => {
    expect(slugifyEggSizeCode("Extra Large")).toBe("EXTRA_LARGE");
  });

  it("collapses punctuation into a single underscore", () => {
    expect(slugifyEggSizeCode("Pee-Wee!!")).toBe("PEE_WEE");
  });

  it("trims leading and trailing underscores", () => {
    expect(slugifyEggSizeCode("  Pullet  ")).toBe("PULLET");
    expect(slugifyEggSizeCode("--Jumbo--")).toBe("JUMBO");
  });

  it("falls back to a placeholder for a name with no ASCII letters or digits", () => {
    expect(slugifyEggSizeCode("!!!")).toBe("SIZE");
    expect(slugifyEggSizeCode("")).toBe("SIZE");
  });

  it("keeps digits", () => {
    expect(slugifyEggSizeCode("Grade 1")).toBe("GRADE_1");
  });
});
