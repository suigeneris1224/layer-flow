import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  // Same relative-path guard the login page applies. Empty means "no
  // destination", which sends the new user to onboarding.
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "";

  // Somebody arriving from an invitation is joining a farm, not starting one.
  const joining = next.startsWith("/invite/");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {joining ? "Create your account" : "Start your farm"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {joining
            ? "Then you can accept the invitation."
            : "Free to start. No card needed."}
        </p>
      </div>

      <SignupForm next={next} />
    </div>
  );
}
