import { afterEach, describe, expect, it } from "vitest";
import { isPlatformAdmin } from "@/lib/auth/admin";

describe("isPlatformAdmin", () => {
  const original = process.env.ADMIN_EMAILS;

  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  it("matches an email in the list", () => {
    process.env.ADMIN_EMAILS = "owner@example.com,cofounder@example.com";
    expect(isPlatformAdmin("owner@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin("Owner@Example.com")).toBe(true);
  });

  it("trims whitespace around list entries", () => {
    process.env.ADMIN_EMAILS = " owner@example.com , cofounder@example.com ";
    expect(isPlatformAdmin("cofounder@example.com")).toBe(true);
  });

  it("rejects an email not in the list", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin("farmer@example.com")).toBe(false);
  });

  it("rejects everyone when unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isPlatformAdmin("owner@example.com")).toBe(false);
  });

  it("rejects everyone when blank", () => {
    process.env.ADMIN_EMAILS = "";
    expect(isPlatformAdmin("owner@example.com")).toBe(false);
  });
});
