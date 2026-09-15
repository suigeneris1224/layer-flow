"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusNote } from "@/components/ui/states";
import { PASSWORD_MAX_LENGTH } from "@/lib/domain/password";
import { signUpAction, type AuthState } from "@/app/auth/actions";

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    undefined
  );
  const [password, setPassword] = useState("");

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && <StatusNote tone="bad">{state.error}</StatusNote>}

      <Field label="Your name" htmlFor="fullName" error={fieldErrors?.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          autoFocus
          aria-invalid={Boolean(fieldErrors?.fullName)}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={Boolean(fieldErrors?.email)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 8 characters, with a mix of letters, numbers, or symbols."
        error={fieldErrors?.password}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors?.password)}
        />
        <PasswordStrengthMeter password={password} />
      </Field>

      <Checkbox
        id="agreeToTerms"
        name="agreeToTerms"
        value="true"
        required
        align="start"
        label={
          <span>
            By creating an account, you agree to the{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Terms &amp; Conditions
            </Link>{" "}
            of LayerFlow
          </span>
        }
      />
      {fieldErrors?.agreeToTerms && (
        <p className="-mt-2 text-xs text-destructive">{fieldErrors.agreeToTerms}</p>
      )}

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
