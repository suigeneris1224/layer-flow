import { describe, expect, it } from "vitest";
import { inviteTokenFromPath } from "@/lib/auth/session";

const VALID_TOKEN = "a".repeat(32) + "b".repeat(32);

describe("inviteTokenFromPath", () => {
  it("extracts a well-formed 64-hex-char token from an invite path", () => {
    expect(inviteTokenFromPath(`/invite/${VALID_TOKEN}`)).toBe(VALID_TOKEN);
  });

  it("rejects a path that isn't under /invite/", () => {
    expect(inviteTokenFromPath(`/dashboard`)).toBeNull();
    expect(inviteTokenFromPath(`/onboarding`)).toBeNull();
  });

  it("rejects a token that doesn't match the expected shape", () => {
    expect(inviteTokenFromPath("/invite/not-a-real-token")).toBeNull();
    expect(inviteTokenFromPath("/invite/" + "a".repeat(63))).toBeNull();
  });

  it("rejects an invite path with extra segments or query strings baked into the token", () => {
    expect(inviteTokenFromPath(`/invite/${VALID_TOKEN}/extra`)).toBeNull();
    expect(inviteTokenFromPath(`/invite/${VALID_TOKEN}?foo=bar`)).toBeNull();
  });
});
