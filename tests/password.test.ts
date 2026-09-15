import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isPasswordSecure,
  passwordStrength,
} from "@/lib/domain/password";

describe("passwordStrength", () => {
  it("scores a short password as Weak", () => {
    expect(passwordStrength("abc123").label).toBe("Weak");
  });

  it("scores a long but single-character-type password as Weak", () => {
    expect(passwordStrength("aaaaaaaa").label).toBe("Weak");
  });

  it("scores 8+ chars with two character types as Fair", () => {
    expect(passwordStrength("abcdefg1").label).toBe("Fair");
  });

  it("scores a mixed-case, digit, symbol password as Good or better", () => {
    const { label } = passwordStrength("Farm2026!");
    expect(["Good", "Strong"]).toContain(label);
  });

  it("scores 'Strong' reachably within the field's own max length", () => {
    const password = "Farm-2026!Coop";
    expect(password.length).toBeLessThanOrEqual(PASSWORD_MAX_LENGTH);
    expect(passwordStrength(password).label).toBe("Strong");
  });
});

describe("isPasswordSecure", () => {
  it("rejects anything shorter than the minimum length", () => {
    expect(isPasswordSecure("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
  });

  it("rejects a long password with no character variety", () => {
    expect(isPasswordSecure("aaaaaaaa")).toBe(false);
  });

  it("accepts a reasonably varied password", () => {
    expect(isPasswordSecure("Farm2026!")).toBe(true);
  });
});
