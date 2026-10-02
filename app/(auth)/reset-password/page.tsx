import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

// Useless as a search result, so kept out of the index (still crawlable).
export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose something you&apos;ll remember.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
