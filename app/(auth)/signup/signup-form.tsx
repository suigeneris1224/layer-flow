"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { signUpAction, type AuthState } from "@/app/auth/actions";

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    undefined
  );

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
          aria-invalid={Boolean(fieldErrors?.password)}
        />
      </Field>

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
