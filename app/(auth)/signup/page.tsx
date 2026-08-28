import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Start your farm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Free to start. No card needed.
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
