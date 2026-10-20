import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { confirmEmailLinkAction } from "@/app/auth/actions";
import { parseConfirmType, safeNext } from "@/lib/domain/auth-link";
import { ConfirmButton } from "./confirm-button";

export const metadata: Metadata = { title: "Confirm", robots: { index: false } };

/**
 * Where the confirmation and password-reset emails land
 * (`{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email|recovery`).
 *
 * Loading this page does nothing; the button does the work
 * (confirmEmailLinkAction). Email link scanners open links but don't press
 * buttons, so they can no longer use up the one-time link before the person
 * does, and the token works on any device, not just the one used to sign up.
 *
 * Anything without a token_hash -- the older `?code=` link, or an error from
 * Supabase -- is handed to /auth/callback, which already handles those.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const tokenHash = one("token_hash");
  const type = parseConfirmType(one("type"));
  const recovery = type === "recovery";
  const next = safeNext(one("next"), recovery ? "/reset-password" : "/dashboard");

  if (!tokenHash || !type) {
    const query = new URLSearchParams();
    for (const key of Object.keys(params)) {
      const value = one(key);
      if (value !== undefined) query.set(key, value);
    }
    redirect(`/auth/callback?${query.toString()}` as Route);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {recovery ? "Reset your password" : "Confirm your email"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {recovery
            ? "Tap below to continue to setting a new password."
            : "One tap and you're in."}
        </p>
      </div>

      <form action={confirmEmailLinkAction}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <ConfirmButton label={recovery ? "Continue" : "Confirm my email"} />
      </form>
    </div>
  );
}
