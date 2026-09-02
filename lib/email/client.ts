import "server-only";

import { serverEnv } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * Outbound transactional email, via Brevo.
 *
 * `EMAIL_PROVIDER=mock` (the default) never calls the network: it logs and
 * reports success, so local dev and tests never need a real Brevo key. Only
 * `EMAIL_PROVIDER=brevo` sends for real.
 *
 * Brevo's free tier caps at 300 emails/day. Not enforced here -- this app's
 * farm count is far below that today -- but if usage grows, add a send-count
 * guard or upgrade the Brevo plan before this becomes a silent-drop problem.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface SendEmailInput {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** Present only when ok is false. */
  error?: string;
}

interface FromAddress {
  name?: string;
  email: string;
}

/** `"LayerFlow <hello@layerflow.local>"` -> `{ name: "LayerFlow", email: "hello@layerflow.local" }`. */
function parseFromHeader(value: string): FromAddress {
  const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (!match) return { email: value.trim() };
  const [, name, email] = match;
  return name ? { name, email } : { email };
}

/**
 * Send one transactional email. Never throws -- a failed send is reported in
 * the result, not an exception, since a farmer's dashboard action or the
 * subscription cron must be able to continue past one bad address.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (serverEnv.emailProvider !== "brevo") {
    logger.info("email (mock)", { email: input.to.email, subject: input.subject });
    return { ok: true };
  }

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": serverEnv.brevoApiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseFromHeader(serverEnv.emailFrom),
        to: [input.to],
        subject: input.subject,
        htmlContent: input.htmlContent,
        textContent: input.textContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error("brevo send failed", { status: response.status, body });
      return { ok: false, error: `Brevo responded with ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    logger.error("brevo send threw", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Could not reach the email provider." };
  }
}
