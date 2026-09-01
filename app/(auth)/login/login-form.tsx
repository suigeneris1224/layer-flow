"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusNote } from "@/components/ui/states";
import { signInAction, type AuthState } from "@/app/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signInAction,
    undefined
  );

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />

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
          aria-describedby={fieldErrors?.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={fieldErrors?.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(fieldErrors?.password)}
          aria-describedby={fieldErrors?.password ? "password-error" : undefined}
        />
      </Field>

      <Checkbox
        id="rememberMe"
        name="rememberMe"
        defaultChecked
        label="Remember me"
      />

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot your password?
        </Link>
        <p className="text-muted-foreground">
          New to LayerFlow?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}
