import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

// Useless as a search result, so kept out of the index (still crawlable).
export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll email you a link to set a new one.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
