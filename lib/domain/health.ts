/**
 * Same-day double-entry detection for Mortality/Feed.
 *
 * Pure module: no React, no Supabase, no I/O -- shared by both forms'
 * client-side warning (components can't do a fresh server round trip here,
 * since this has to work offline too).
 */

export interface SameDayRecord {
  id: string;
  flockId: string;
  /** `recordDate` for mortality, `usageDate` for feed -- caller normalizes. */
  date: string;
  recordedByName: string | null;
}

/**
 * Other entries for the same flock and date, excluding the one currently
 * being edited (if any) -- a flock can legitimately be fed, or lose birds,
 * more than once a day, so this informs a warning, never a block.
 */
export function findSameDayEntries<T extends SameDayRecord>(
  records: readonly T[],
  flockId: string,
  date: string,
  excludeId?: string
): T[] {
  return records.filter(
    (record) => record.flockId === flockId && record.date === date && record.id !== excludeId
  );
}
