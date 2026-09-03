import { describe, expect, it } from "vitest";
import { describeAuthError } from "@/lib/errors";

describe("describeAuthError", () => {
  it("maps known messages the same regardless of context", () => {
    expect(describeAuthError("Invalid login credentials").error).toBe(
      "That email or password is incorrect."
    );
    expect(describeAuthError("User already registered", "signUp").error).toBe(
      "An account with this email already exists. Try signing in."
    );
  });

  it("falls back to a sign-in-specific message by default", () => {
    expect(describeAuthError("some unrecognized failure").error).toBe(
      "We couldn't sign you in. Please try again."
    );
  });

  it("falls back to a signup-specific message for signup failures", () => {
    expect(describeAuthError("some unrecognized failure", "signUp").error).toBe(
      "We couldn't create your account. Please try again."
    );
  });

  it("falls back to a password-specific message for password-reset failures", () => {
    expect(describeAuthError("some unrecognized failure", "password").error).toBe(
      "We couldn't update your password. Please try again."
    );
  });

  it("never mentions signing in for an unmatched signup or password error", () => {
    expect(describeAuthError("some unrecognized failure", "signUp").error).not.toMatch(/sign you in/i);
    expect(describeAuthError("some unrecognized failure", "password").error).not.toMatch(/sign you in/i);
  });
});
