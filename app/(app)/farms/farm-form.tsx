"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { createFarmAction, updateFarmAction } from "./actions";

interface FarmValues {
  name: string;
  barangay: string;
  municipality: string;
  province: string;
}

const EMPTY: FarmValues = { name: "", barangay: "", municipality: "", province: "" };

/**
 * Edit the current farm's details, or add another one.
 *
 * One component for both: the fields are identical, and a farmer adding a
 * second farm on Pro benefits from the same layout they already know from
 * onboarding.
 */
export function FarmForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: FarmValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(mode === "edit");
  const [values, setValues] = useState<FarmValues>(initial ?? EMPTY);

  function set<K extends keyof FarmValues>(key: K, value: FarmValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const result =
        mode === "edit" ? await updateFarmAction(values) : await createFarmAction(values);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (mode === "create") {
        setValues(EMPTY);
        setOpen(false);
      }
      setSuccess(mode === "edit" ? "Farm details saved." : "Farm added.");
      router.refresh();
    });
  }

  if (mode === "create" && !open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Warehouse className="size-4" aria-hidden />
        Add another farm
      </Button>
    );
  }

  return (
    <Panel title={mode === "edit" ? "Edit farm details" : "Add a farm"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <Field label="Farm name" htmlFor="farm-name" error={fieldErrors.name}>
          <Input
            id="farm-name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            aria-invalid={!!fieldErrors.name}
          />
        </Field>

        <Field
          label="Barangay"
          htmlFor="farm-barangay"
          hint="Optional."
          error={fieldErrors.barangay}
        >
          <Input
            id="farm-barangay"
            value={values.barangay}
            onChange={(event) => set("barangay", event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Municipality / City"
            htmlFor="farm-municipality"
            error={fieldErrors.municipality}
          >
            <Input
              id="farm-municipality"
              value={values.municipality}
              onChange={(event) => set("municipality", event.target.value)}
              aria-invalid={!!fieldErrors.municipality}
            />
          </Field>

          <Field label="Province" htmlFor="farm-province" error={fieldErrors.province}>
            <Input
              id="farm-province"
              value={values.province}
              onChange={(event) => set("province", event.target.value)}
              aria-invalid={!!fieldErrors.province}
            />
          </Field>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            loading={pending}
            disabled={!values.name || !values.municipality || !values.province}
          >
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add farm"}
          </Button>
          {mode === "create" && (
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
