"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { updatePasswordAction, type AuthState } from "@/app/auth/actions";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    undefined
  );

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state && !state.ok && <StatusNote tone="bad">{state.error}</StatusNote>}

      <Field
        label="New password"
        htmlFor="password"
        hint="At least 8 characters."
        error={fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
          aria-invalid={Boolean(fieldErrors?.password)}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={fieldErrors?.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={Boolean(fieldErrors?.confirmPassword)}
        />
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
