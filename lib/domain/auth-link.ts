/**
 * Emailed auth links: where they may send people and what they confirm.
 *
 * Used by /auth/confirm (the button page the email templates point at),
 * /auth/callback (the older PKCE link) and the sign-up/reset actions.
 *
 * Pure module, no I/O.
 */

/**
 * Keep a `?next=` inside the app.
 *
 * A crafted value must never bounce somebody to another origin carrying a
 * freshly minted session, so anything that is not a plain relative path falls
 * back. `/\evil.com` is refused too: browsers read a backslash as a slash.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

/** The link types /auth/confirm accepts: sign-up confirmation and password reset. */
export type ConfirmLinkType = "email" | "signup" | "recovery";

export function parseConfirmType(value: string | null | undefined): ConfirmLinkType | null {
  return value === "email" || value === "signup" || value === "recovery" ? value : null;
}
