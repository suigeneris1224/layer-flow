"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";
import { saveFarmDefaultsAction } from "./actions";

export function FarmDefaultsForm({
  currentCapacity,
  currentBreed,
}: {
  currentCapacity: number | null;
  currentBreed: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [capacity, setCapacity] = useState(currentCapacity ? String(currentCapacity) : "");
  const [breed, setBreed] = useState(currentBreed ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    startTransition(async () => {
      const result = await saveFarmDefaultsAction({
        defaultHouseCapacity: capacity,
        defaultFlockBreed: breed,
      });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <Panel title="Production defaults">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">Production defaults saved.</StatusNote>}

        <Field
          label="Default house capacity"
          htmlFor="default-house-capacity"
          hint="Pre-fills capacity when you add a new house. Leave blank for none."
          error={fieldErrors.defaultHouseCapacity}
        >
          <NumberInput
            id="default-house-capacity"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            aria-invalid={!!fieldErrors.defaultHouseCapacity}
          />
        </Field>

        <Field
          label="Default flock breed"
          htmlFor="default-flock-breed"
          hint="Pre-fills breed when you add a new flock. Leave blank for none."
          error={fieldErrors.defaultFlockBreed}
        >
          <Input
            id="default-flock-breed"
            value={breed}
            onChange={(event) => setBreed(event.target.value)}
            aria-invalid={!!fieldErrors.defaultFlockBreed}
          />
        </Field>

        <div>
          <Button type="submit" loading={pending}>
            <Layers className="size-4" aria-hidden />
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
