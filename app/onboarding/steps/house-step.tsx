"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { createHouseAction, type OnboardingActionState } from "@/app/onboarding/actions";

export function HouseStep({ farmName }: { farmName: string }) {
  const [state, formAction, pending] = useActionState<OnboardingActionState, FormData>(
    createHouseAction,
    undefined
  );

  const fieldErrors = state?.fieldErrors;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Add your first house
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A house is a building or pen at {farmName}. You can add more later.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {state && <StatusNote tone="bad">{state.error}</StatusNote>}

        <Field label="House name" htmlFor="name" error={fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="House A"
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field
          label="Capacity"
          htmlFor="capacity"
          hint="How many hens this house can hold."
          error={fieldErrors?.capacity}
        >
          <NumberInput
            id="capacity"
            name="capacity"
            min={1}
            required
            placeholder="1500"
            aria-invalid={Boolean(fieldErrors?.capacity)}
          />
        </Field>

        <Button type="submit" size="lg" block loading={pending}>
          {pending ? "Adding house…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
