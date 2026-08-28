"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { createFlockAction, type OnboardingActionState } from "@/app/onboarding/actions";

interface HouseOption {
  id: string;
  name: string;
  capacity: number;
}

/** Breeds common on Philippine layer farms. Free text is still allowed. */
const COMMON_BREEDS = ["ISA Brown", "Lohmann Brown", "Hy-Line Brown", "Dekalb White", "Babcock"];

export function FlockStep({ houses, today }: { houses: HouseOption[]; today: string }) {
  const [state, formAction, pending] = useActionState<OnboardingActionState, FormData>(
    createFlockAction,
    undefined
  );

  const fieldErrors = state?.fieldErrors;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Add your first flock
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A flock is one batch of hens placed together.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {state && <StatusNote tone="bad">{state.error}</StatusNote>}

        <Field label="Flock name" htmlFor="name" error={fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="Flock #001"
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field label="Breed" htmlFor="breed" hint="Optional." error={fieldErrors?.breed}>
          <Input
            id="breed"
            name="breed"
            list="breed-options"
            placeholder="ISA Brown"
            aria-invalid={Boolean(fieldErrors?.breed)}
          />
          <datalist id="breed-options">
            {COMMON_BREEDS.map((breed) => (
              <option key={breed} value={breed} />
            ))}
          </datalist>
        </Field>

        <Field label="House" htmlFor="houseId" error={fieldErrors?.houseId}>
          <Select id="houseId" name="houseId" required defaultValue={houses[0]?.id ?? ""}>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name} — holds {house.capacity.toLocaleString()}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Number of hens"
          htmlFor="initialHens"
          error={fieldErrors?.initialHens}
        >
          <NumberInput
            id="initialHens"
            name="initialHens"
            min={1}
            required
            placeholder="1000"
            aria-invalid={Boolean(fieldErrors?.initialHens)}
          />
        </Field>

        <Field
          label="Placement date"
          htmlFor="placementDate"
          hint="The day the hens arrived."
          error={fieldErrors?.placementDate}
        >
          <Input
            id="placementDate"
            name="placementDate"
            type="date"
            max={today}
            defaultValue={today}
            required
            aria-invalid={Boolean(fieldErrors?.placementDate)}
          />
        </Field>

        <Field
          label="Date they started laying"
          htmlFor="startLayingDate"
          hint="Leave blank if they haven't started yet."
          error={fieldErrors?.startLayingDate}
        >
          <Input
            id="startLayingDate"
            name="startLayingDate"
            type="date"
            max={today}
            aria-invalid={Boolean(fieldErrors?.startLayingDate)}
          />
        </Field>

        <Button type="submit" size="lg" block loading={pending}>
          {pending ? "Adding flock…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
