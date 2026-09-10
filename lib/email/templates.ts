import { publicEnv } from "@/lib/config/env";
import { PLANS, formatPlanPrice } from "@/lib/subscriptions/plans";
import { formatDate } from "@/lib/format";
import { renderEmailHtml } from "@/lib/email/layout";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * Transactional email copy.
 *
 * Pure functions, no I/O -- see lib/email/client.ts for the thing that
 * actually sends what these build, and lib/email/layout.ts for the shared
 * header/hero/card/CTA/footer system every builder here composes through, so
 * every email in the product reads as the same design.
 *
 * Kept honest about billing being mock: the receipt never claims to be a tax
 * invoice, and the past-due reminder never claims access is cut off, matching
 * the "two deliberate kindnesses" in lib/subscriptions/entitlements.ts (only
 * CANCELED/EXPIRED lose access).
 *
 * The plain-text alternative (`text`) is the one thing tests pin down
 * (tests/email-templates.test.ts) -- change its wording deliberately, not as
 * a side effect of a visual tweak to `html`.
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

/** The plain-text alternative every template builds -- unchanged in shape since before the HTML redesign. */
function wrapText(bodyLines: string[]): string {
  return [`Hi,`, "", ...bodyLines, "", "-- Layer Flow"].join("\n");
}

export function buildReceiptEmail(ctx: SubscriptionEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const farms = formatFarmList(ctx.farmNames);
  const bodyLines = [
    `Here's a summary of your LayerFlow subscription, covering ${farms}:`,
    `Plan: ${plan.name} (${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)})`,
    `Status: ${ctx.status}`,
    renewalLine(ctx.currentPeriodEnd),
    `This is a summary of your LayerFlow subscription, not an official tax invoice.`,
  ];

  const html = renderEmailHtml({
    preheader: `Your ${plan.name} plan summary for ${farms}.`,
    eyebrow: "SUBSCRIPTION SUMMARY",
    headline: `Your ${plan.name} plan`,
    heroMessage: `Here's where things stand for ${farms}.`,
    heroIcon: "receipt",
    intro: [`This is a summary of your Layer Flow subscription, not an official tax invoice.`],
    infoCard: {
      title: "Subscription details",
      rows: [
        {
          icon: "box",
          label: "Plan",
          value: `${plan.name} — ${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}`,
        },
        { icon: "check-circle", label: "Status", value: ctx.status },
        {
          icon: "refresh",
          label: "Renewal",
          value: ctx.currentPeriodEnd ? formatDate(ctx.currentPeriodEnd) : "Not yet set",
        },
      ],
    },
    cta: { label: "View billing", href: `${publicEnv.appUrl}/billing` },
  });

  return { subject: `Your LayerFlow ${plan.name} plan`, html, text: wrapText(bodyLines) };
}

export function buildPastDueReminderEmail(ctx: SubscriptionEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const farms = formatFarmList(ctx.farmNames);
  const bodyLines = [
    `We weren't able to process the last payment for your LayerFlow account covering ${farms} (${plan.name}, ${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}).`,
    `Your farms keep full access while this is sorted out -- nothing has been switched off.`,
    `Please update your payment details when you get a chance.`,
  ];

  const html = renderEmailHtml({
    preheader: `We couldn't process your last payment for ${farms}.`,
    eyebrow: "PAYMENT REMINDER",
    headline: "Let's sort out your payment",
    heroMessage: `We weren't able to process the last payment for ${farms}.`,
    heroIcon: "alert-triangle",
    intro: [
      `Your farms keep full access while this is sorted out — nothing has been switched off.`,
      `Please update your payment details when you get a chance.`,
    ],
    infoCard: {
      title: "Account details",
      rows: [
        {
          icon: "box",
          label: "Plan",
          value: `${plan.name} — ${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}`,
        },
      ],
    },
    cta: { label: "Update payment", href: `${publicEnv.appUrl}/billing` },
  });

  return { subject: `Payment reminder for ${farms}`, html, text: wrapText(bodyLines) };
}

export function buildRenewalReminderEmail(
  ctx: SubscriptionEmailContext,
  daysUntilRenewal: number
): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const farms = formatFarmList(ctx.farmNames);
  const dayWord = `day${daysUntilRenewal === 1 ? "" : "s"}`;
  const bodyLines = [
    `Your ${plan.name} plan (${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}), covering ${farms}, renews in ${daysUntilRenewal} ${dayWord}.`,
    renewalLine(ctx.currentPeriodEnd),
    `No action is needed unless your payment details have changed.`,
  ];

  const html = renderEmailHtml({
    preheader: `Your ${plan.name} plan renews in ${daysUntilRenewal} ${dayWord}.`,
    eyebrow: "RENEWAL REMINDER",
    headline: `Renewing in ${daysUntilRenewal} ${dayWord}`,
    heroMessage: `Covering ${farms}. No action needed unless your payment details have changed.`,
    heroIcon: "refresh",
    infoCard: {
      title: "Renewal details",
      rows: [
        {
          icon: "box",
          label: "Plan",
          value: `${plan.name} — ${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}`,
        },
        {
          icon: "calendar",
          label: "Renews",
          value: ctx.currentPeriodEnd ? formatDate(ctx.currentPeriodEnd) : "Not yet set",
        },
      ],
    },
    cta: { label: "Manage subscription", href: `${publicEnv.appUrl}/billing` },
  });

  return {
    subject: `Your ${plan.name} plan renews in ${daysUntilRenewal} ${dayWord}`,
    html,
    text: wrapText(bodyLines),
  };
}

export interface ManualPaymentEmailContext {
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
}

/** Sent when an admin approves a manual QR/bank transfer payment -- see app/admin/actions.ts. */
export function buildManualPaymentApprovedEmail(ctx: ManualPaymentEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const price = `${formatPlanPrice(plan, ctx.billingPeriod)} / ${periodNoun(ctx.billingPeriod)}`;
  const bodyLines = [
    `Your manual payment has been verified and your account is now on the ${plan.name} plan (${price}).`,
    `Thanks for your patience while we confirmed the transfer.`,
  ];

  const html = renderEmailHtml({
    preheader: `Payment confirmed -- your ${plan.name} plan is now active.`,
    eyebrow: "PAYMENT RECEIVED",
    headline: "Payment successful",
    heroMessage: `Thanks for your patience while we confirmed the transfer.`,
    heroIcon: "check-circle",
    infoCard: {
      title: "Payment details",
      rows: [
        { icon: "box", label: "Plan", value: plan.name },
        { icon: "card", label: "Amount", value: price },
        { icon: "check-circle", label: "Status", value: "Active" },
      ],
    },
    cta: { label: "Go to your dashboard", href: `${publicEnv.appUrl}/dashboard` },
  });

  return { subject: `Your LayerFlow ${plan.name} plan is active`, html, text: wrapText(bodyLines) };
}

/** Sent when an admin rejects a manual QR/bank transfer payment -- see app/admin/actions.ts. */
export function buildManualPaymentRejectedEmail(
  ctx: ManualPaymentEmailContext & { reason?: string }
): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const bodyLines = [
    `We couldn't verify your recent manual payment${ctx.reason ? `: ${ctx.reason}` : "."}`,
    `Please double check the reference number and try submitting again, or contact support if you think this is a mistake.`,
  ];

  const html = renderEmailHtml({
    preheader: "We couldn't verify your recent manual payment.",
    eyebrow: "PAYMENT NOT VERIFIED",
    headline: "We couldn't verify your payment",
    heroMessage: ctx.reason ?? "Please double check the reference number and try again.",
    heroIcon: "alert-circle",
    infoCard: ctx.reason
      ? { title: "Reason", rows: [{ icon: "note", label: "Details", value: ctx.reason }] }
      : undefined,
    intro: [
      `Please double check the reference number and try submitting again, or contact support if you think this is a mistake.`,
    ],
    cta: {
      label: "Resubmit payment",
      href: `${publicEnv.appUrl}/checkout?plan=${ctx.plan}&period=${ctx.billingPeriod}`,
    },
  });

  return { subject: `We couldn't verify your payment`, html, text: wrapText(bodyLines) };
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

  const html = renderEmailHtml({
    preheader: `New support request from ${ctx.farmName}.`,
    eyebrow: ctx.priority ? "PRIORITY SUPPORT REQUEST" : "NEW SUPPORT REQUEST",
    headline: ctx.subject,
    heroMessage: `From ${ctx.farmName} (${ctx.submitterEmail})`,
    heroIcon: "mail",
    intro: [ctx.message],
    cta: { label: "Open in admin", href: `${publicEnv.appUrl}/admin` },
    showBrandMessage: false,
  });

  return { subject: `${tag}Support request: ${ctx.subject}`, html, text: bodyLines.join("\n\n") };
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

  const html = renderEmailHtml({
    preheader: `The Layer Flow team replied: ${ctx.subject}`,
    eyebrow: "SUPPORT REPLY",
    headline: ctx.subject,
    heroMessage: `The Layer Flow team replied to your support request from ${ctx.farmName}.`,
    heroIcon: "chat",
    intro: [ctx.body],
    cta: { label: "View conversation", href: `${publicEnv.appUrl}/support` },
  });

  return { subject: `Re: ${ctx.subject}`, html, text: bodyLines.join("\n\n") };
}

export interface WelcomeEmailContext {
  fullName: string;
}

/**
 * Sent after signup. Not wired to a trigger yet -- app/auth/actions.ts's
 * signUpAction doesn't send email today -- but ready to call from there.
 */
export function buildWelcomeEmail(ctx: WelcomeEmailContext): BuiltEmail {
  const bodyLines = [
    `Welcome to LayerFlow! We're glad you're here.`,
    `You're all set to start tracking your flock's daily production, sales and expenses in one place.`,
    `Head to your dashboard whenever you're ready to record today's collection.`,
  ];

  const html = renderEmailHtml({
    preheader: "You're all set -- here's how to get started on Layer Flow.",
    eyebrow: "WELCOME TO LAYER FLOW",
    headline: `Welcome, ${ctx.fullName}!`,
    heroMessage: `We're glad you're here. Let's get your flock's numbers into one place.`,
    heroIcon: "egg",
    greetingName: ctx.fullName,
    intro: [
      `You're all set to start tracking your flock's daily production, sales and expenses in one place.`,
    ],
    features: [
      {
        icon: "clipboard",
        title: "Record your first day",
        text: "Log this morning's collection in under 30 seconds.",
      },
      {
        icon: "chart",
        title: "Watch your numbers",
        text: "See production, inventory and profit update as you go.",
      },
      {
        icon: "users",
        title: "Bring your team",
        text: "Invite managers and workers once you're on Pro.",
      },
    ],
    cta: { label: "Go to your dashboard", href: `${publicEnv.appUrl}/dashboard` },
  });

  return { subject: "Welcome to LayerFlow", html, text: wrapText(bodyLines) };
}

/**
 * Sent when a subscription is cancelled. Not wired to a trigger yet -- there
 * is no cancel-subscription action in the codebase today (only an admin/dev
 * override that can set status to CANCELED) -- but ready to call once one
 * exists.
 */
export function buildSubscriptionCancelledEmail(ctx: SubscriptionEmailContext): BuiltEmail {
  const plan = PLANS[ctx.plan];
  const farms = formatFarmList(ctx.farmNames);
  const accessLine = ctx.currentPeriodEnd
    ? `You'll keep full access to ${farms} until ${formatDate(ctx.currentPeriodEnd)}.`
    : `Access for ${farms} has already ended.`;

  const bodyLines = [
    `Your ${plan.name} subscription covering ${farms} has been cancelled.`,
    accessLine,
    `If this was a mistake, or you'd like to tell us why, just reply to this email -- we read every one.`,
  ];

  const html = renderEmailHtml({
    preheader: `Your ${plan.name} subscription has been cancelled.`,
    eyebrow: "SUBSCRIPTION CANCELLED",
    headline: "We're sorry to see you go",
    heroMessage: `Your ${plan.name} subscription covering ${farms} has been cancelled.`,
    heroIcon: "log-out",
    intro: [
      accessLine,
      `If this was a mistake, or you'd like to tell us why, just reply to this email — we read every one.`,
    ],
    infoCard: {
      title: "Cancellation details",
      rows: [
        { icon: "box", label: "Plan", value: plan.name },
        {
          icon: "calendar",
          label: ctx.currentPeriodEnd ? "Access until" : "Access",
          value: ctx.currentPeriodEnd ? formatDate(ctx.currentPeriodEnd) : "Already ended",
        },
      ],
    },
    cta: { label: "Reactivate subscription", href: `${publicEnv.appUrl}/billing` },
    secondaryNote: "Changed your mind? You can reactivate any time.",
  });

  return {
    subject: `Your LayerFlow subscription has been cancelled`,
    html,
    text: wrapText(bodyLines),
  };
}
