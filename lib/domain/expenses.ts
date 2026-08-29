import type { ExpenseCategory } from "@/lib/types/database";

/**
 * Expense category labels.
 *
 * The category itself is a fixed Postgres enum, not a table -- there is no
 * farmer-editable "categories" list, so this map is the single source for how
 * each value reads in both the form's select and the list's column.
 */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FEED: "Feed",
  CHICKS: "Chicks",
  MEDICINE: "Medicine",
  VACCINE: "Vaccine",
  LABOR: "Labor",
  ELECTRICITY: "Electricity",
  WATER: "Water",
  TRANSPORT: "Transport",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];
