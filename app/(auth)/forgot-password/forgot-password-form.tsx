"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { requestPasswordResetAction, type AuthState } from "@/app/auth/actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordResetAction,
    undefined
  );

  // Success is deliberately vague about whether the address exists.
  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <StatusNote tone="good" title="Check your email">
          {state.message}
        </StatusNote>
        <Link href="/login" className="text-center text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state && !state.ok && <StatusNote tone="bad">{state.error}</StatusNote>}

      <Field label="Email" htmlFor="email" error={fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          aria-invalid={Boolean(fieldErrors?.email)}
        />
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <Link href="/login" className="text-center text-sm text-primary hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
