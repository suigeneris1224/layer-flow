import type { Metadata } from "next";
import { StatusNote } from "@/components/ui/states";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const LINK_ERRORS: Record<string, string> = {
  invalid_link: "That link has expired or was already used. Please request a new one.",
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
      <div>
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
