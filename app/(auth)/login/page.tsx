import type { Metadata } from "next";
import { StatusNote } from "@/components/ui/states";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const LINK_ERRORS: Record<string, string> = {
  // Most often the account IS confirmed -- the link was opened twice, or an
  // email scanner opened it first -- so point at signing in, not signing up.
  invalid_link:
    "That link was already used or has expired. If you've already confirmed your email, just sign in below.",
  invalid_reset:
    "That password reset link was already used or has expired. Use “Forgot your password?” below to get a new one.",
  missing_code: "That link was incomplete. Please try again from your email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/dashboard";
  const linkError = params.error ? LINK_ERRORS[params.error] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to record today&apos;s production.
        </p>
      </div>

      {linkError && <StatusNote tone="warn">{linkError}</StatusNote>}

      <LoginForm next={next} />
    </div>
  );
}
