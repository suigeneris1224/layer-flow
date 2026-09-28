import { describe, expect, it } from "vitest";
import { groupEmailEvents } from "@/lib/domain/email-events";
import type { EmailEventRow } from "@/lib/data/email-events";

/** Terse builder so each test shows only the fields it cares about. */
function row(overrides: Partial<EmailEventRow> = {}): EmailEventRow {
  return {
    id: "row-1",
    messageId: "msg-1",
    recipient: "ana@example.com",
    event: "delivered",
    subject: null,
    tag: "receipt",
    occurredAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("groupEmailEvents", () => {
  it("collapses repeated opens on the same message into one row with a count", () => {
    const rows = [
      row({ id: "3", event: "opened", occurredAt: "2026-09-01T03:00:00.000Z" }),
      row({ id: "2", event: "opened", occurredAt: "2026-09-01T02:00:00.000Z" }),
      row({ id: "1", event: "opened", occurredAt: "2026-09-01T01:00:00.000Z" }),
    ];
    const groups = groupEmailEvents(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(3);
    // Newest-first input -- the group keeps the first (most recent) timestamp.
    expect(groups[0].occurredAt).toBe("2026-09-01T03:00:00.000Z");
  });

  it("collapses repeated clicks the same way as opens", () => {
    const rows = [
      row({ id: "2", event: "click" }),
      row({ id: "1", event: "click" }),
    ];
    expect(groupEmailEvents(rows)[0].count).toBe(2);
  });

  it("never collapses one-time event types like delivered or a bounce", () => {
    const rows = [
      row({ id: "1", event: "delivered" }),
      row({ id: "2", event: "hard_bounce" }),
    ];
    const groups = groupEmailEvents(rows);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.count === 1)).toBe(true);
  });

  it("keeps opens on different messages as separate groups", () => {
    const rows = [
      row({ id: "1", messageId: "msg-1", event: "opened" }),
      row({ id: "2", messageId: "msg-2", event: "opened" }),
    ];
    const groups = groupEmailEvents(rows);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.count === 1)).toBe(true);
  });

  it("keeps opens vs clicks on the same message as separate groups", () => {
    const rows = [
      row({ id: "1", event: "opened" }),
      row({ id: "2", event: "click" }),
    ];
    const groups = groupEmailEvents(rows);
    expect(groups).toHaveLength(2);
  });

  it("falls back to recipient+tag when message_id is missing", () => {
    const rows = [
      row({ id: "2", messageId: null, event: "opened" }),
      row({ id: "1", messageId: null, event: "opened" }),
    ];
    expect(groupEmailEvents(rows)[0].count).toBe(2);
  });

  it("does not group different recipients even with no message id", () => {
    const rows = [
      row({ id: "1", messageId: null, recipient: "ana@example.com", event: "opened" }),
      row({ id: "2", messageId: null, recipient: "bob@example.com", event: "opened" }),
    ];
    expect(groupEmailEvents(rows)).toHaveLength(2);
  });

  it("returns an empty array for no rows", () => {
    expect(groupEmailEvents([])).toEqual([]);
  });

  it("preserves overall newest-first ordering across mixed groups", () => {
    const rows = [
      row({ id: "1", event: "opened", occurredAt: "2026-09-01T03:00:00.000Z" }),
      row({ id: "2", event: "delivered", occurredAt: "2026-09-01T02:00:00.000Z" }),
      row({ id: "3", event: "opened", occurredAt: "2026-09-01T01:00:00.000Z" }), // collapses into the first group
    ];
    const groups = groupEmailEvents(rows);
    expect(groups.map((g) => g.event)).toEqual(["opened", "delivered"]);
    expect(groups[0].count).toBe(2);
  });
});
