"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { StatusNote } from "@/components/ui/states";
import { PASSWORD_MAX_LENGTH } from "@/lib/domain/password";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    startTransition(async () => {
      const result = await changePasswordAction({ password, confirmPassword });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    });
  }

  return (
    <Panel title="Change password">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">Your password has been changed.</StatusNote>}

        <Field
          label="New password"
          htmlFor="new-password"
          hint="At least 8 characters, with a mix of letters, numbers, or symbols."
          error={fieldErrors.password}
        >
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            minLength={8}
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={!!fieldErrors.password}
          />
          <PasswordStrengthMeter password={password} />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="confirm-password"
          error={fieldErrors.confirmPassword}
        >
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={!!fieldErrors.confirmPassword}
          />
        </Field>

        <div>
          <Button
            type="submit"
            variant="outline"
            loading={pending}
            disabled={!password || !confirmPassword}
          >
            <KeyRound className="size-4" aria-hidden />
            {pending ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
