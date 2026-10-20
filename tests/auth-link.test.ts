import { describe, expect, it } from "vitest";
import { parseConfirmType, safeNext } from "@/lib/domain/auth-link";

describe("safeNext", () => {
  it("keeps in-app paths", () => {
    expect(safeNext("/onboarding")).toBe("/onboarding");
    expect(safeNext("/invite/abc123")).toBe("/invite/abc123");
    expect(safeNext("/reset-password?x=1")).toBe("/reset-password?x=1");
  });

  it("refuses anything that could leave the site", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
  });

  it("falls back when missing", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
    expect(safeNext(undefined, "/onboarding")).toBe("/onboarding");
  });
});

describe("parseConfirmType", () => {
  it("accepts sign-up confirmation and password reset", () => {
    expect(parseConfirmType("email")).toBe("email");
    expect(parseConfirmType("signup")).toBe("signup");
    expect(parseConfirmType("recovery")).toBe("recovery");
  });

  it("rejects anything else", () => {
    expect(parseConfirmType("magiclink")).toBeNull();
    expect(parseConfirmType("invite")).toBeNull();
    expect(parseConfirmType(null)).toBeNull();
  });
});
