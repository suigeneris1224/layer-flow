import { describe, expect, it } from "vitest";
import { money, toCsv, type CsvColumn } from "@/lib/export/csv";

interface Row {
  text: string | null | undefined;
  amount: number;
}

const COLUMNS: CsvColumn<Row>[] = [
  { header: "Text", value: (row) => row.text },
  { header: "Amount", value: (row) => money(row.amount), numeric: true },
];

function cells(csv: string): string[][] {
  return csv
    .split("\r\n")
    .slice(0, -1)
    .map((line) => line.split(","));
}

describe("toCsv", () => {
  it("emits the header even with no rows, and still ends with CRLF", () => {
    expect(toCsv([], COLUMNS)).toBe("Text,Amount\r\n");
  });

  it("separates records with CRLF and terminates the last one", () => {
    const csv = toCsv(
      [
        { text: "a", amount: 1 },
        { text: "b", amount: 2 },
      ],
      COLUMNS
    );
    expect(csv).toBe("Text,Amount\r\na,1.00\r\nb,2.00\r\n");
  });

  it("leaves ordinary values unquoted", () => {
    expect(cells(toCsv([{ text: "Flock 001", amount: 0 }], COLUMNS))[1][0]).toBe("Flock 001");
  });

  it("quotes a field containing a comma", () => {
    const csv = toCsv([{ text: "Santos, Maria", amount: 0 }], COLUMNS);
    expect(csv).toContain('"Santos, Maria"');
  });

  it("doubles an embedded quote and quotes the field", () => {
    const csv = toCsv([{ text: 'the "big" house', amount: 0 }], COLUMNS);
    expect(csv).toContain('"the ""big"" house"');
  });

  it("keeps a record intact when a value contains a newline", () => {
    const csv = toCsv([{ text: "line one\nline two", amount: 5 }], COLUMNS);
    expect(csv).toBe('Text,Amount\r\n"line one\nline two",5.00\r\n');
  });

  it("writes null and undefined as empty, never the string null", () => {
    const csv = toCsv([{ text: null, amount: 0 }, { text: undefined, amount: 0 }], COLUMNS);
    expect(csv).toBe("Text,Amount\r\n,0.00\r\n,0.00\r\n");
    expect(csv).not.toContain("null");
    expect(csv).not.toContain("undefined");
  });

  it("preserves edge whitespace by quoting it", () => {
    const csv = toCsv([{ text: "  padded  ", amount: 0 }], COLUMNS);
    expect(csv).toContain('"  padded  "');
  });

  /*
   * A CSV opened in Excel executes leading-formula cells. Customer names and
   * expense descriptions are text a user typed, so they get defanged.
   */
  it.each(["=SUM(A1)", "+1", "-1+2", "@import", "\tstart", "\rstart"])(
    "defangs the formula-leading value %j",
    (value) => {
      const csv = toCsv([{ text: value, amount: 0 }], COLUMNS);
      expect(csv).toContain("'");
    }
  );

  /*
   * The exclusion that matters. Defanging every field would turn -1250.00 into
   * text and break the one thing a bookkeeper does with this file.
   */
  it("does not defang a negative number in a numeric column", () => {
    const csv = toCsv([{ text: "refund", amount: -1250 }], COLUMNS);
    expect(csv).toBe("Text,Amount\r\nrefund,-1250.00\r\n");
    expect(csv).not.toContain("'-1250");
  });

  it("passes accented text and the peso sign through unchanged", () => {
    const csv = toCsv([{ text: "Muñoz ₱", amount: 0 }], COLUMNS);
    expect(csv).toContain("Muñoz ₱");
  });

  it("does not prepend a byte order mark", () => {
    expect(toCsv([], COLUMNS).startsWith("﻿")).toBe(false);
  });
});

describe("money", () => {
  it("gives two decimals with no symbol or separator", () => {
    expect(money(1234.5)).toBe("1234.50");
    expect(money(0)).toBe("0.00");
    expect(money(-99.999)).toBe("-100.00");
  });
});
