import type { EmailEventRow } from "@/lib/data/email-events";

/**
 * Collapsing Brevo's noisiest delivery events.
 *
 * Pure module: no I/O, so this is directly testable against fixture rows.
 */

/**
 * Event types that legitimately repeat per message: a recipient can open an
 * email or click a link more than once, and Brevo's webhook fires a fresh
 * event every time. Every other event type (delivered, a bounce, spam, ...)
 * only ever happens once per message, so those are left as one row each.
 */
const REPEATABLE_EVENTS = new Set(["opened", "click"]);

export interface EmailEventGroup {
  /** Stable React key -- the underlying row id when ungrouped, the group key otherwise. */
  id: string;
  messageId: string | null;
  recipient: string;
  tag: string | null;
  event: string;
  /** How many raw events this row collapses. 1 for anything not repeatable. */
  count: number;
  /** Most recent occurrence in the group. */
  occurredAt: string;
}

/**
 * Collapse repeated opened/click events for the same message into one row
 * with a count, so a farmer re-opening a receipt three times doesn't read as
 * three separate emails on the admin log.
 *
 * Grouped by message id when Brevo sent one, falling back to recipient+tag
 * when it didn't -- rare, but nothing here requires message_id to be present.
 *
 * Expects `rows` newest-first (as getRecentEmailEvents returns them): the
 * first occurrence seen for a group is already its most recent, so a later,
 * older duplicate only ever increments the count, never the timestamp.
 */
export function groupEmailEvents(rows: readonly EmailEventRow[]): EmailEventGroup[] {
  const groups = new Map<string, EmailEventGroup>();
  const order: string[] = [];

  for (const row of rows) {
    if (!REPEATABLE_EVENTS.has(row.event)) {
      groups.set(row.id, {
        id: row.id,
        messageId: row.messageId,
        recipient: row.recipient,
        tag: row.tag,
        event: row.event,
        count: 1,
        occurredAt: row.occurredAt,
      });
      order.push(row.id);
      continue;
    }

    const key = `${row.messageId ?? `${row.recipient}|${row.tag ?? ""}`}|${row.event}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        id: key,
        messageId: row.messageId,
        recipient: row.recipient,
        tag: row.tag,
        event: row.event,
        count: 1,
        occurredAt: row.occurredAt,
      });
      order.push(key);
    }
  }

  return order.map((key) => groups.get(key)!);
}
