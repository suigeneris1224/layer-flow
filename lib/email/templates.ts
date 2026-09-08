import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import { formatDate } from "@/lib/format";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * Subscription email copy.
 *
 * Pure functions, no I/O -- see lib/email/client.ts for the thing that
 * actually sends what these build. Kept honest about billing being mock:
 * the receipt never claims to be a tax invoice, and the past-due reminder
 * never claims access is cut off, matching the "two deliberate kindnesses"
 * in lib/subscriptions/entitlements.ts (only CANCELED/EXPIRED lose access).
 */

/** Days before `current_period_end` the renewal reminder goes out. */
export const SUBSCRIPTION_REMINDER_DAYS = 3;

export interface SubscriptionEmailContext {
  /** Every farm this account owns -- subscriptions are account-wide, not per farm. */
  farmNames: string[];
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  /** ISO timestamp, or null when no billing period has been recorded yet. */
  currentPeriodEnd: string | null;
}

function periodNoun(billingPeriod: BillingPeriod): string {
  return billingPeriod === "ANNUAL" ? "year" : "month";
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

function renewalLine(currentPeriodEnd: string | null): string {
  return currentPeriodEnd
    ? `Renews on ${formatDate(currentPeriodEnd)}.`
    : "Renewal date not yet set.";
}

/** "Farm A" / "Farm A and Farm B" / "Farm A, Farm B, and Farm C" -- for account-wide email copy. */
function formatFarmList(names: string[]): string {
  if (names.length === 0) return "your farm";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function wrap(bodyLines: string[]): { html: string; text: string } {
  const text = [`Hi,`, "", ...bodyLines, "", "-- LayerFlow"].join("\n");
  const html = `<p>Hi,</p>${bodyLines.map((line) => `<p>${line}</p>`).join("")}<p>-- LayerFlow</p>`;
  return { html, text };
}

export function buildReceiptEmail(ctx: SubscriptionEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const farms = formatFarmList(ctx.farmNames);
  const { html, text } = wrap([
    `Here's a summary of your LayerFlow subscription, covering ${farms}:`,
    `Plan: ${plan.name} (${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)})`,
    `Status: ${ctx.status}`,
    renewalLine(ctx.currentPeriodEnd),
    `This is a summary of your LayerFlow subscription, not an official tax invoice.`,
  ]);

  return { subject: `Your LayerFlow ${plan.name} plan`, html, text };
}

export function buildPastDueReminderEmail(ctx: SubscriptionEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const farms = formatFarmList(ctx.farmNames);
  const { html, text } = wrap([
    `We weren't able to process the last payment for your LayerFlow account covering ${farms} (${plan.name}, ${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}).`,
    `Your farms keep full access while this is sorted out -- nothing has been switched off.`,
    `Please update your payment details when you get a chance.`,
  ]);

  return { subject: `Payment reminder for ${farms}`, html, text };
}

export function buildRenewalReminderEmail(
  ctx: SubscriptionEmailContext,
  daysUntilRenewal: number
): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const farms = formatFarmList(ctx.farmNames);
  const { html, text } = wrap([
    `Your ${plan.name} plan (${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}), covering ${farms}, renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}.`,
    renewalLine(ctx.currentPeriodEnd),
    `No action is needed unless your payment details have changed.`,
  ]);

  return {
    subject: `Your ${plan.name} plan renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}`,
    html,
    text,
  };
}

/** Notifies the support inbox of a new request -- see app/(app)/support/actions.ts. */
export function buildSupportRequestNotificationEmail(ctx: {
  farmName: string;
  submitterEmail: string;
  priority: boolean;
  subject: string;
  message: string;
}): BuiltEmail {
  const tag = ctx.priority ? "[Priority] " : "";
  const bodyLines = [
    `New support request from ${ctx.farmName} (${ctx.submitterEmail})${ctx.priority ? " -- Pro plan, priority handling." : "."}`,
    `Subject: ${ctx.subject}`,
    ctx.message,
  ];

  return {
    subject: `${tag}Support request: ${ctx.subject}`,
    html: `<p>${bodyLines.map((line) => line.replace(/\n/g, "<br />")).join("</p><p>")}</p>`,
    text: bodyLines.join("\n\n"),
  };
}

/** Notifies a farmer that support replied to their ticket. */
export function buildSupportReplyEmail(ctx: {
  farmName: string;
  subject: string;
  body: string;
}): BuiltEmail {
  const bodyLines = [
    `The LayerFlow team replied to your support request from ${ctx.farmName}.`,
    `Subject: ${ctx.subject}`,
    ctx.body,
  ];

  return {
    subject: `Re: ${ctx.subject}`,
    html: `<p>${bodyLines.map((line) => line.replace(/\n/g, "<br />")).join("</p><p>")}</p>`,
    text: bodyLines.join("\n\n"),
  };
}
