"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { LocationButton, type FarmCoordinates } from "@/components/farm/location-button";
import { createFarmAction, type OnboardingActionState } from "@/app/onboarding/actions";

export function FarmStep() {
  const [state, formAction, pending] = useActionState<OnboardingActionState, FormData>(
    createFarmAction,
    undefined
  );

  const fieldErrors = state?.fieldErrors;
  const [location, setLocation] = useState<FarmCoordinates | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Where is your farm?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how your farm will appear across LayerFlow.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {state && <StatusNote tone="bad">{state.error}</StatusNote>}

        <Field label="Farm name" htmlFor="name" error={fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="e.g. Cebu City Egg Farm"
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field
          label="Barangay"
          htmlFor="barangay"
          hint="Optional."
          error={fieldErrors?.barangay}
        >
          <Input
            id="barangay"
            name="barangay"
            placeholder="e.g. Your Barangay"
            aria-invalid={Boolean(fieldErrors?.barangay)}
          />
        </Field>

        <Field
          label="Municipality or city"
          htmlFor="municipality"
          error={fieldErrors?.municipality}
        >
          <Input
            id="municipality"
            name="municipality"
            required
            placeholder="e.g. Your City / Municipality"
            aria-invalid={Boolean(fieldErrors?.municipality)}
          />
        </Field>

        <Field label="Province" htmlFor="province" error={fieldErrors?.province}>
          <Input
            id="province"
            name="province"
            required
            placeholder="e.g. Your Province"
            aria-invalid={Boolean(fieldErrors?.province)}
          />
        </Field>

        <Field
          label="Farm location (for weather)"
          htmlFor="farm-location"
          hint="Optional. If you're at the farm now, tap this for a more accurate forecast. You can also do it later in Farm settings."
          error={fieldErrors?.latitude}
        >
          <div id="farm-location">
            <LocationButton value={location} onChange={setLocation} />
          </div>
          <input type="hidden" name="latitude" value={location?.latitude ?? ""} />
          <input type="hidden" name="longitude" value={location?.longitude ?? ""} />
        </Field>

        <Button type="submit" size="lg" block loading={pending}>
          {pending ? "Creating your farm…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
