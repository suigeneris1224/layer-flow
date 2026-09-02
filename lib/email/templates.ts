import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import { formatDate } from "@/lib/format";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

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
  farmName: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** ISO timestamp, or null when no billing period has been recorded yet. */
  currentPeriodEnd: string | null;
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

function wrap(farmName: string, bodyLines: string[]): { html: string; text: string } {
  const text = [`Hi,`, "", ...bodyLines, "", "-- LayerFlow"].join("\n");
  const html = `<p>Hi,</p>${bodyLines.map((line) => `<p>${line}</p>`).join("")}<p>-- LayerFlow</p>`;
  return { html, text };
}

export function buildReceiptEmail(ctx: SubscriptionEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const { html, text } = wrap(ctx.farmName, [
    `Here's a summary of ${ctx.farmName}'s LayerFlow subscription:`,
    `Plan: ${plan.name} (${formatPlanPrice(plan)} / month)`,
    `Status: ${ctx.status}`,
    renewalLine(ctx.currentPeriodEnd),
    `This is a summary of your LayerFlow subscription, not an official tax invoice.`,
  ]);

  return { subject: `Your LayerFlow ${plan.name} plan`, html, text };
}

export function buildPastDueReminderEmail(ctx: SubscriptionEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const { html, text } = wrap(ctx.farmName, [
    `We weren't able to process the last payment for ${ctx.farmName} (${plan.name}, ${formatPlanPrice(plan)} / month).`,
    `Your farm keeps full access while this is sorted out -- nothing has been switched off.`,
    `Please update your payment details when you get a chance.`,
  ]);

  return { subject: `Payment reminder for ${ctx.farmName}`, html, text };
}

export function buildRenewalReminderEmail(
  ctx: SubscriptionEmailContext,
  daysUntilRenewal: number
): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const { html, text } = wrap(ctx.farmName, [
    `${ctx.farmName}'s ${plan.name} plan (${formatPlanPrice(plan)} / month) renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}.`,
    renewalLine(ctx.currentPeriodEnd),
    `No action is needed unless your payment details have changed.`,
  ]);

  return {
    subject: `Your ${plan.name} plan renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}`,
    html,
    text,
  };
}
