import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";

/**
 * PayMongo billing provider -- the `createCheckout()`/`cancelSubscription()`/
 * `getSubscription()`/`handleWebhook()` shape docs/billing.md promises,
 * backed by PayMongo's Links API (https://developers.paymongo.com/reference/
 * the-link-object): one REST call returns a hosted `checkout_url`, so this
 * app never has to build its own GCash/card picker UI.
 *
 * PayMongo has no native recurring-subscription object. A Link only ever
 * pays for one billing cycle -- `subscriptions.current_period_end` (set by
 * the webhook handler in app/api/webhooks/paymongo/route.ts) is the sole
 * source of truth for when the next one is due, exactly like the manual
 * GCash-QR flow already works. `cancelSubscription` below is a local status
 * flip for that reason, not a call to PayMongo.
 *
 * Test vs live is selected entirely by which key is configured
 * (`sk_test_...` vs `sk_live_...`) -- nothing here branches on isProduction.
 */

const API_BASE = "https://api.paymongo.com/v1";

function authHeader(): string {
  return `Basic ${Buffer.from(`${serverEnv.paymongoSecretKey}:`).toString("base64")}`;
}

async function paymongoFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export interface CreateCheckoutInput {
  ownerId: string;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  /** PayMongo's Link id (e.g. "link_xxx") -- stored as paymongo_payments.provider_link_id. */
  providerReferenceId: string;
}

/** A PayMongo Link for one billing cycle. Amount is server-computed by the caller, never client-sent. */
export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const description = `LayerFlow ${input.plan} -- ${
    input.billingPeriod === "ANNUAL" ? "annual" : "monthly"
  } subscription`;

  const response = await paymongoFetch("/links", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          amount: input.amountCentavos,
          description,
          remarks: input.ownerId,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("paymongo createCheckout failed", { status: response.status, body });
    throw new Error("PayMongo checkout could not be created.");
  }

  const json = (await response.json()) as {
    data: { id: string; attributes: { checkout_url: string } };
  };

  return {
    checkoutUrl: json.data.attributes.checkout_url,
    providerReferenceId: json.data.id,
  };
}

/**
 * Local-only: flips `subscriptions.status` to CANCELED (see the caller in
 * app/(app)/billing/actions.ts or app/admin/actions.ts). There is no live
 * PayMongo subscription resource to cancel -- a Link is spent the moment it's
 * paid -- so this function intentionally has nothing to call. Kept as part of
 * the provider interface so the call site doesn't need to know which
 * provider is active.
 */
export function cancelSubscription(): void {
  // No-op by design. See the doc comment above.
}

export type PaymongoLinkStatus = "unpaid" | "paid" | "expired" | "unknown";

/** Read a Link's current status directly -- an admin "check status" fallback; the webhook is the primary path. */
export async function getSubscription(providerReferenceId: string): Promise<PaymongoLinkStatus> {
  const response = await paymongoFetch(`/links/${providerReferenceId}`);
  if (!response.ok) {
    logger.error("paymongo getSubscription failed", {
      status: response.status,
      providerReferenceId,
    });
    return "unknown";
  }

  const json = (await response.json()) as { data: { attributes: { status: string } } };
  const status = json.data.attributes.status;
  if (status === "paid" || status === "unpaid" || status === "expired") return status;
  return "unknown";
}

export type PaymongoEventType = "payment.paid" | "unhandled";

export interface PaymongoWebhookEvent {
  type: PaymongoEventType;
  /** The Link id this event is about -- matches paymongo_payments.provider_link_id. */
  linkId: string | null;
  /** The Payment id, once paid -- stored as paymongo_payments.provider_payment_id. */
  paymentId: string | null;
  raw: unknown;
}

/**
 * Verify PayMongo's webhook signature and normalize the event.
 *
 * PayMongo signs each delivery with a `Paymongo-Signature` header shaped
 * `t=<timestamp>,te=<test-mode-hmac>,li=<live-mode-hmac>` -- the HMAC-SHA256
 * of `<timestamp>.<rawBody>` keyed by the webhook secret, using the `te` part
 * while running in test mode. **Confirm this exact header/HMAC-input format
 * against PayMongo's current webhook documentation before relying on it in
 * production** -- it guards a real unauthenticated endpoint and must not be
 * shipped from memory alone.
 *
 * Returns null on a missing/invalid signature; the caller answers 401.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value] as const;
    })
  );

  const timestamp = parts.t;
  const providedHmac = parts.te; // test-mode signature; swap to `li` once PAYMONGO_SECRET_KEY is a live key.
  if (!timestamp || !providedHmac) return false;

  const expectedHmac = createHmac("sha256", serverEnv.paymongoWebhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(providedHmac);
  const b = Buffer.from(expectedHmac);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Normalize a verified webhook payload into the shape the route handler acts on. */
export function parseWebhookEvent(rawBody: string): PaymongoWebhookEvent {
  const payload = JSON.parse(rawBody) as {
    data?: {
      attributes?: {
        type?: string;
        data?: { id?: string; attributes?: { linked_data?: { id?: string } } };
      };
    };
  };

  const eventType = payload.data?.attributes?.type;
  const resource = payload.data?.attributes?.data;

  // "link.payment.paid" is the only Link-scoped event PayMongo's dashboard
  // exposes (confirmed against the live event picker) -- there is no
  // link.payment.failed/expired event. A Link that's never paid just stays
  // PENDING in paymongo_payments; the farmer can start a fresh checkout,
  // same as an ignored manual-payment reference number never getting
  // reviewed. Register only this one event in PayMongo Dashboard ->
  // Developers -> Webhooks.
  const type: PaymongoEventType = eventType === "link.payment.paid" ? "payment.paid" : "unhandled";

  return {
    type,
    linkId: resource?.attributes?.linked_data?.id ?? null,
    paymentId: resource?.id ?? null,
    raw: payload,
  };
}
