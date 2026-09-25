import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseWebhookEvent, verifyWebhookSignature } from "@/lib/subscriptions/paymongo";

const SECRET = "whsec_test_secret";

function signaturesFor(rawBody: string, timestamp = "1700000000"): string {
  const hmac = createHmac("sha256", SECRET).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},te=${hmac},li=unused`;
}

/** Same shape, but signed under the live-mode field instead. */
function liveSignatureFor(rawBody: string, timestamp = "1700000000"): string {
  const hmac = createHmac("sha256", SECRET).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},te=unused,li=${hmac}`;
}

beforeAll(() => {
  process.env.PAYMONGO_WEBHOOK_SECRET = SECRET;
  // verifyWebhookSignature picks te/li based on this key's prefix -- test
  // mode by default, flipped to a live key inside the tests that need it.
  process.env.PAYMONGO_SECRET_KEY = "sk_test_dummy";
});

describe("verifyWebhookSignature", () => {
  const rawBody = JSON.stringify({ data: { id: "evt_1" } });

  it("accepts a correctly signed payload", () => {
    expect(verifyWebhookSignature(rawBody, signaturesFor(rawBody))).toBe(true);
  });

  it("rejects a payload that doesn't match the signature (tampered body)", () => {
    const signature = signaturesFor(rawBody);
    const tampered = JSON.stringify({ data: { id: "evt_2" } });
    expect(verifyWebhookSignature(tampered, signature)).toBe(false);
  });

  it("rejects a signature signed with the wrong secret", () => {
    const wrongHmac = createHmac("sha256", "wrong_secret")
      .update(`1700000000.${rawBody}`)
      .digest("hex");
    expect(verifyWebhookSignature(rawBody, `t=1700000000,te=${wrongHmac},li=unused`)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWebhookSignature(rawBody, null)).toBe(false);
  });

  it("rejects a malformed signature header missing required parts", () => {
    expect(verifyWebhookSignature(rawBody, "t=1700000000")).toBe(false);
  });

  describe("with a live secret key configured", () => {
    const originalKey = process.env.PAYMONGO_SECRET_KEY;

    beforeAll(() => {
      process.env.PAYMONGO_SECRET_KEY = "sk_live_dummy";
    });

    afterAll(() => {
      process.env.PAYMONGO_SECRET_KEY = originalKey;
    });

    it("accepts a correctly signed live-mode payload", () => {
      expect(verifyWebhookSignature(rawBody, liveSignatureFor(rawBody))).toBe(true);
    });

    it("rejects a test-mode-only signature -- the live field is what's checked now", () => {
      // signaturesFor signs `te` correctly but leaves `li=unused`, so under a
      // live key this must fail even though the payload is genuinely signed.
      expect(verifyWebhookSignature(rawBody, signaturesFor(rawBody))).toBe(false);
    });
  });
});

describe("parseWebhookEvent", () => {
  function linkPayload(type: string, linkId: string | null, paymentId: string | null) {
    return JSON.stringify({
      data: {
        attributes: {
          type,
          data: {
            id: paymentId,
            attributes: { linked_data: linkId ? { id: linkId } : undefined },
          },
        },
      },
    });
  }

  it("maps link.payment.paid to payment.paid with the link and payment ids", () => {
    const event = parseWebhookEvent(linkPayload("link.payment.paid", "link_abc", "pay_123"));
    expect(event.type).toBe("payment.paid");
    expect(event.linkId).toBe("link_abc");
    expect(event.paymentId).toBe("pay_123");
  });

  it("maps link.payment.failed to unhandled -- PayMongo has no such event, but a stray delivery shouldn't crash", () => {
    const event = parseWebhookEvent(linkPayload("link.payment.failed", "link_abc", "pay_123"));
    expect(event.type).toBe("unhandled");
  });

  it("maps an unrecognized event type to unhandled", () => {
    const event = parseWebhookEvent(linkPayload("link.something_else", "link_abc", "pay_123"));
    expect(event.type).toBe("unhandled");
  });

  it("returns a null linkId when the payload carries none", () => {
    const event = parseWebhookEvent(linkPayload("link.payment.paid", null, "pay_123"));
    expect(event.linkId).toBeNull();
  });
});
