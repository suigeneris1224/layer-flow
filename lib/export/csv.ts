/**
 * CSV serialization, RFC 4180.
 *
 * Pure on purpose: no Supabase, no `server-only`, no formatting helpers from
 * lib/format. A spreadsheet cell is not a screen -- `formatCurrency` produces
 * "PHP 1,234.50", which Excel reads as text and SUM silently ignores. Money
 * comes through `money()` below as a bare number instead.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  /**
   * Skip formula defanging for this column.
   *
   * Set it on every numeric column. Without it a negative amount like -1250.00
   * starts with "-" and would be quoted into text, which is exactly the thing
   * this whole module exists to avoid.
   */
  numeric?: boolean;
}

/** Money as a spreadsheet can add it up: no symbol, no thousands separator. */
export function money(value: number): string {
  return value.toFixed(2);
}

/** Fields needing quotes: the RFC's set, plus edge whitespace a reader would eat. */
const MUST_QUOTE = /[",\r\n]/;

/**
 * Leading characters that make Excel and Sheets treat a cell as a formula.
 *
 * Customer names and expense descriptions are free text somebody typed, and a
 * CSV mailed to a lender and opened in Excel is a live code path. The cost is
 * a visible leading apostrophe in LibreOffice, which is the better trade.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function encode(raw: string | number | null | undefined, numeric: boolean): string {
  if (raw === null || raw === undefined) return "";

  let field = String(raw);
  if (!numeric && FORMULA_START.test(field)) field = `'${field}`;

  const needsQuotes = MUST_QUOTE.test(field) || field !== field.trim();
  return needsQuotes ? `"${field.replace(/"/g, '""')}"` : field;
}

/**
 * Rows and a column list to a CSV string.
 *
 * Columns are data rather than code so the header row and the cell order
 * cannot drift apart, and so a test can pin the order -- a bookkeeper's
 * formulas reference column positions, and reordering them should have to be
 * a deliberate act.
 *
 * No byte order mark here. The BOM belongs to the HTTP response, which keeps
 * these tests reading the way a CSV actually looks.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const header = columns.map((column) => encode(column.header, false)).join(",");

  const body = rows.map((row) =>
    columns.map((column) => encode(column.value(row), column.numeric === true)).join(",")
  );

  // Trailing CRLF included: the RFC allows it and Excel prefers it.
  return [header, ...body].join("\r\n") + "\r\n";
}
