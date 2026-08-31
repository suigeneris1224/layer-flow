import { describe, expect, it } from "vitest";
import {
  EXPENSE_COLUMNS,
  SALES_COLUMNS,
  expensesToRows,
  salesToRows,
} from "@/lib/export/datasets";
import { toCsv } from "@/lib/export/csv";
import type { SaleEntry } from "@/lib/data/sales";
import type { ExpenseEntry } from "@/lib/data/expenses";

function sale(overrides: Partial<SaleEntry> = {}): SaleEntry {
  return {
    id: "sale-1",
    saleDate: "2026-08-31",
    customerName: "Maria Santos",
    totalAmount: 1234.5,
    amountPaid: 1000,
    outstanding: 234.5,
    paymentStatus: "PARTIAL",
    totalEggs: 60,
    lines: [
      { sizeName: "Large", quantityTrays: 2, quantityEggs: 0, subtotal: 700 },
      { sizeName: "Medium", quantityTrays: 1, quantityEggs: 5, subtotal: 534.5 },
    ],
    ...overrides,
  };
}

function expense(overrides: Partial<ExpenseEntry> = {}): ExpenseEntry {
  return {
    id: "exp-1",
    expenseDate: "2026-08-30",
    category: "FEED",
    description: "Layer mash",
    amount: 4500,
    flockName: "Flock #001",
    ...overrides,
  };
}

describe("salesToRows", () => {
  it("emits one row per line item", () => {
    expect(salesToRows([sale()], "PHP")).toHaveLength(2);
  });

  it("numbers the lines from one", () => {
    expect(salesToRows([sale()], "PHP").map((row) => row.lineNo)).toEqual([1, 2]);
  });

  /*
   * The whole reason for the row shape: repeating the sale total on both lines
   * would make SUM(Sale total) report 2469 for a 1234.50 sale.
   */
  it("puts sale-level money on the first line only", () => {
    const rows = salesToRows([sale()], "PHP");
    expect(rows[0].saleTotal).toBe(1234.5);
    expect(rows[0].amountPaid).toBe(1000);
    expect(rows[0].outstanding).toBe(234.5);
    expect(rows[1].saleTotal).toBeNull();
    expect(rows[1].amountPaid).toBeNull();
    expect(rows[1].outstanding).toBeNull();
  });

  it("keeps the line subtotals on every row", () => {
    expect(salesToRows([sale()], "PHP").map((row) => row.lineSubtotal)).toEqual([700, 534.5]);
  });

  it("still emits one row for a sale with no line items", () => {
    const rows = salesToRows([sale({ lines: [] })], "PHP");
    expect(rows).toHaveLength(1);
    expect(rows[0].saleTotal).toBe(1234.5);
    expect(rows[0].lineNo).toBeNull();
    expect(rows[0].sizeName).toBeNull();
  });

  it("leaves a walk-in customer empty rather than naming one", () => {
    const rows = salesToRows([sale({ customerName: null })], "PHP");
    expect(rows[0].customer).toBeNull();
    expect(toCsv(rows, SALES_COLUMNS)).not.toContain("Walk-in");
  });

  it("writes money as a bare number a spreadsheet can add up", () => {
    const csv = toCsv(salesToRows([sale()], "PHP"), SALES_COLUMNS);
    expect(csv).toContain("1234.50");
    expect(csv).not.toContain("₱");
    expect(csv).not.toContain("1,234");
  });

  /*
   * Bookkeepers write formulas against column positions. Reordering these
   * should have to be a deliberate act, so the order is pinned here.
   */
  it("has a stable column order", () => {
    expect(SALES_COLUMNS.map((column) => column.header)).toEqual([
      "Sale date",
      "Sale ID",
      "Customer",
      "Line no.",
      "Egg size",
      "Trays",
      "Eggs",
      "Line subtotal",
      "Sale total",
      "Amount paid",
      "Outstanding",
      "Payment status",
      "Currency",
    ]);
  });
});

describe("expensesToRows", () => {
  it("carries both the human label and the enum code", () => {
    const rows = expensesToRows([expense()], "PHP");
    expect(rows[0].category).toBe("Feed");
    expect(rows[0].categoryCode).toBe("FEED");
  });

  it("leaves an unattributed flock empty", () => {
    expect(expensesToRows([expense({ flockName: null })], "PHP")[0].flock).toBeNull();
  });

  it("writes the amount as a bare number", () => {
    expect(toCsv(expensesToRows([expense()], "PHP"), EXPENSE_COLUMNS)).toContain("4500.00");
  });

  it("has a stable column order", () => {
    expect(EXPENSE_COLUMNS.map((column) => column.header)).toEqual([
      "Expense date",
      "Expense ID",
      "Category",
      "Category code",
      "Description",
      "Flock",
      "Amount",
      "Currency",
    ]);
  });
});
