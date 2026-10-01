import type { ExpenseCategory, PaymentStatus } from "@/lib/types/database";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/domain/expenses";
import { money, type CsvColumn } from "@/lib/export/csv";
import type { SaleEntry } from "@/lib/data/sales";
import type { ExpenseEntry } from "@/lib/data/expenses";
import { PLANS } from "@/lib/subscriptions/plans";
import type { PaymentHistoryRow as MergedPaymentHistoryRow } from "@/lib/domain/payment-history";
import type { WaitlistEntry } from "@/lib/data/waitlist";
import { flockSizeLabel } from "@/lib/domain/waitlist";

/**
 * The shape each dataset takes in a spreadsheet.
 *
 * Pure -- these take the same entries the pages already render and flatten
 * them. Nothing here reaches a database, so the column contract is testable
 * without one.
 *
 * A null flock is an empty cell -- the UI omits it too (see expenses/page.tsx),
 * so there's no established name to carry through. A null sale customer is
 * the one exception: the app's own UI always calls it "Walk-in" (sales/page.tsx,
 * sales/[id]/payment/page.tsx), so the export uses that same term rather than
 * a blank cell a bookkeeper can't tell apart from missing data.
 */

export interface SaleRow {
  saleDate: string;
  saleId: string;
  customer: string;
  /** 1-based within the sale; null when the sale has no line items at all. */
  lineNo: number | null;
  sizeName: string | null;
  trays: number | null;
  eggs: number | null;
  lineSubtotal: number | null;
  /** Sale-level money, on the first row of each sale only. See salesToRows. */
  saleTotal: number | null;
  amountPaid: number | null;
  outstanding: number | null;
  paymentStatus: PaymentStatus | null;
  currency: string;
}

export const SALES_COLUMNS: readonly CsvColumn<SaleRow>[] = [
  { header: "Sale date", value: (row) => row.saleDate },
  { header: "Sale ID", value: (row) => row.saleId },
  { header: "Customer", value: (row) => row.customer },
  { header: "Line no.", value: (row) => row.lineNo, numeric: true },
  { header: "Egg size", value: (row) => row.sizeName },
  { header: "Trays", value: (row) => row.trays, numeric: true },
  { header: "Eggs", value: (row) => row.eggs, numeric: true },
  {
    header: "Line subtotal",
    value: (row) => (row.lineSubtotal === null ? null : money(row.lineSubtotal)),
    numeric: true,
  },
  {
    header: "Sale total",
    value: (row) => (row.saleTotal === null ? null : money(row.saleTotal)),
    numeric: true,
  },
  {
    header: "Amount paid",
    value: (row) => (row.amountPaid === null ? null : money(row.amountPaid)),
    numeric: true,
  },
  {
    header: "Outstanding",
    value: (row) => (row.outstanding === null ? null : money(row.outstanding)),
    numeric: true,
  },
  { header: "Payment status", value: (row) => row.paymentStatus },
  { header: "Currency", value: (row) => row.currency },
];

/**
 * One row per line item, with sale-level money on the first row of each sale.
 *
 * Repeating the sale total on every line would make SUM(Sale total)
 * double-count a two-line sale, and silently -- the file would still look
 * right. Emitting it once means both SUM(Line subtotal) and SUM(Sale total)
 * come out equal to real revenue, which is the whole reason to hand somebody
 * a spreadsheet instead of a screenshot.
 *
 * A sale with no line items still yields exactly one row. Dropping it would
 * make the revenue column stop reconciling against /reports.
 */
export function salesToRows(sales: readonly SaleEntry[], currency: string): SaleRow[] {
  return sales.flatMap((sale): SaleRow[] => {
    const head = {
      saleDate: sale.saleDate,
      saleId: sale.id,
      customer: sale.customerName ?? "Walk-in",
      saleTotal: sale.totalAmount,
      amountPaid: sale.amountPaid,
      outstanding: sale.outstanding,
      paymentStatus: sale.paymentStatus,
      currency,
    };

    if (sale.lines.length === 0) {
      return [
        {
          ...head,
          lineNo: null,
          sizeName: null,
          trays: null,
          eggs: null,
          lineSubtotal: null,
        },
      ];
    }

    return sale.lines.map((line, index) => ({
      ...head,
      lineNo: index + 1,
      sizeName: line.sizeName,
      trays: line.quantityTrays,
      eggs: line.quantityEggs,
      lineSubtotal: line.subtotal,
      // Sale-level money belongs to the sale, not to each of its lines.
      saleTotal: index === 0 ? sale.totalAmount : null,
      amountPaid: index === 0 ? sale.amountPaid : null,
      outstanding: index === 0 ? sale.outstanding : null,
      paymentStatus: index === 0 ? sale.paymentStatus : null,
    }));
  });
}

export interface ExpenseRow {
  expenseDate: string;
  expenseId: string;
  category: string;
  categoryCode: ExpenseCategory;
  description: string;
  flock: string | null;
  amount: number;
  currency: string;
}

export const EXPENSE_COLUMNS: readonly CsvColumn<ExpenseRow>[] = [
  { header: "Expense date", value: (row) => row.expenseDate },
  { header: "Expense ID", value: (row) => row.expenseId },
  { header: "Category", value: (row) => row.category },
  { header: "Category code", value: (row) => row.categoryCode },
  { header: "Description", value: (row) => row.description },
  { header: "Flock", value: (row) => row.flock },
  { header: "Amount", value: (row) => money(row.amount), numeric: true },
  { header: "Currency", value: (row) => row.currency },
];

/**
 * Both the label and the enum code.
 *
 * "Feed" is what a lender reads; FEED is what survives being imported back
 * into anything. Carrying one without the other makes the file worse for one
 * of the two readers.
 */
export function expensesToRows(
  expenses: readonly ExpenseEntry[],
  currency: string
): ExpenseRow[] {
  return expenses.map((expense) => ({
    expenseDate: expense.expenseDate,
    expenseId: expense.id,
    category: EXPENSE_CATEGORY_LABELS[expense.category],
    categoryCode: expense.category,
    description: expense.description,
    flock: expense.flockName,
    amount: expense.amount,
    currency,
  }));
}

export interface PaymentHistoryCsvRow {
  submittedDate: string;
  paymentId: string;
  source: string;
  payerName: string;
  farm: string | null;
  ownerEmail: string | null;
  plan: string;
  billingPeriod: string;
  amount: number;
  referenceNumber: string | null;
  paymentNote: string | null;
  status: string;
  settledDate: string | null;
  currency: string;
}

export const PAYMENT_HISTORY_COLUMNS: readonly CsvColumn<PaymentHistoryCsvRow>[] = [
  { header: "Submitted date", value: (row) => row.submittedDate },
  { header: "Payment ID", value: (row) => row.paymentId },
  { header: "Source", value: (row) => row.source },
  { header: "Payer name", value: (row) => row.payerName },
  { header: "Farm", value: (row) => row.farm },
  { header: "Owner email", value: (row) => row.ownerEmail },
  { header: "Plan", value: (row) => row.plan },
  { header: "Billing period", value: (row) => row.billingPeriod },
  { header: "Amount", value: (row) => money(row.amount), numeric: true },
  { header: "Currency", value: (row) => row.currency },
  { header: "Reference number", value: (row) => row.referenceNumber },
  { header: "Payment note", value: (row) => row.paymentNote },
  { header: "Status", value: (row) => row.status },
  { header: "Settled date", value: (row) => row.settledDate },
];

const SOURCE_LABELS: Record<MergedPaymentHistoryRow["source"], string> = {
  manual: "Manual",
  paymongo: "GCash (PayMongo)",
};

/**
 * A cross-tenant dataset -- unlike sales/expenses, `currency` isn't a single
 * farm's setting, so it's fixed at PHP here: every payment amount
 * (lib/subscriptions/plans.ts's priceCentavosFor) is quoted in PHP already.
 */
export function paymentHistoryToRows(
  payments: readonly MergedPaymentHistoryRow[]
): PaymentHistoryCsvRow[] {
  return payments.map((payment) => ({
    submittedDate: payment.createdAt,
    paymentId: payment.id,
    source: SOURCE_LABELS[payment.source],
    payerName: payment.payerName ?? payment.ownerEmail ?? "—",
    farm: payment.farmName,
    ownerEmail: payment.ownerEmail,
    plan: PLANS[payment.plan].name,
    billingPeriod: payment.billingPeriod === "ANNUAL" ? "Annual" : "Monthly",
    amount: payment.amountCentavos / 100,
    referenceNumber: payment.referenceNumber,
    paymentNote: payment.paymentNote,
    status: payment.status,
    settledDate: payment.settledAt,
    currency: "PHP",
  }));
}

/**
 * The paid-plan waitlist, for contacting farmers when paid plans open. Every
 * row has a consent timestamp -- consent is required to join at all.
 */
export const WAITLIST_COLUMNS: readonly CsvColumn<WaitlistEntry>[] = [
  { header: "Joined", value: (row) => row.joinedAt.slice(0, 10) },
  { header: "Farm", value: (row) => row.farmName },
  { header: "Owner email", value: (row) => row.ownerEmail },
  // Local 09XX form: a leading "+" would be defanged as a formula by toCsv
  // (showing as '+639...), and 09XX is how farmers read their own numbers.
  { header: "Mobile number", value: (row) => row.mobileNumber.replace(/^\+63/, "0") },
  { header: "Flock size", value: (row) => flockSizeLabel(row.flockSize) },
  { header: "Plan wanted", value: (row) => PLANS[row.planWanted].name },
  { header: "Trial started", value: (row) => row.trialStartedAt?.slice(0, 10) ?? null },
  { header: "Trial ends", value: (row) => row.trialEndsAt?.slice(0, 10) ?? null },
  { header: "Contact consent", value: (row) => row.contactConsentAt.slice(0, 10) },
];
