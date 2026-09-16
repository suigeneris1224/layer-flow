import { describe, expect, it } from "vitest";
import { evaluateRateLimit, formatRetryMessage, type RateLimitRule } from "@/lib/domain/rate-limit";

const rule: RateLimitRule = { windowSeconds: 900, max: 3 };
const now = new Date("2026-09-16T12:00:00.000Z");

describe("evaluateRateLimit", () => {
  it("allows a request when hits in the window are under the max", () => {
    const hits = [new Date("2026-09-16T11:55:00.000Z")];
    expect(evaluateRateLimit(hits, rule, now)).toEqual({ allowed: true, retryAfterSeconds: null });
  });

  it("allows the exact Nth hit (max is inclusive of the next attempt)", () => {
    const hits = [
      new Date("2026-09-16T11:55:00.000Z"),
      new Date("2026-09-16T11:56:00.000Z"),
    ];
    expect(evaluateRateLimit(hits, rule, now)).toEqual({ allowed: true, retryAfterSeconds: null });
  });

  it("blocks once the window already holds max hits", () => {
    const hits = [
      new Date("2026-09-16T11:50:00.000Z"),
      new Date("2026-09-16T11:55:00.000Z"),
      new Date("2026-09-16T11:58:00.000Z"),
    ];
    const decision = evaluateRateLimit(hits, rule, now);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).not.toBeNull();
  });

  it("computes retryAfterSeconds from the oldest hit in the window, not the newest", () => {
    // Oldest hit at 11:50; window is 900s (15min), so it ages out at 12:05.
    const hits = [
      new Date("2026-09-16T11:50:00.000Z"),
      new Date("2026-09-16T11:55:00.000Z"),
      new Date("2026-09-16T11:58:00.000Z"),
    ];
    const decision = evaluateRateLimit(hits, rule, now);
    expect(decision.retryAfterSeconds).toBe(5 * 60);
  });

  it("never returns a retryAfterSeconds below 1, even at the boundary", () => {
    const hits = [
      new Date("2026-09-16T11:45:00.000Z"),
      new Date("2026-09-16T11:45:00.000Z"),
      new Date("2026-09-16T11:45:00.000Z"),
    ];
    const decision = evaluateRateLimit(hits, rule, now);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("treats an empty window as allowed", () => {
    expect(evaluateRateLimit([], rule, now)).toEqual({ allowed: true, retryAfterSeconds: null });
  });
});

describe("formatRetryMessage", () => {
  it("rounds up to whole minutes", () => {
    expect(formatRetryMessage(61)).toBe("Too many attempts. Try again in 2 minutes.");
    expect(formatRetryMessage(60)).toBe("Too many attempts. Try again in 1 minute.");
  });

  it("floors at 1 minute, including for null", () => {
    expect(formatRetryMessage(1)).toBe("Too many attempts. Try again in 1 minute.");
    expect(formatRetryMessage(null)).toBe("Too many attempts. Try again in 1 minute.");
  });
});
