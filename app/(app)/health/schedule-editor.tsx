"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import { formatAge } from "@/lib/domain/vaccination-schedule";
import type { ScheduleItemEntry } from "@/lib/data/vaccination-schedule";
import {
  createScheduleItemAction,
  deleteScheduleItemAction,
  updateScheduleItemAction,
} from "./schedule-actions";

const NEW = "__new__";

/** Show a stored day count in the unit it was most likely typed in. */
function splitAge(days: number): { value: string; unit: "days" | "weeks" } {
  return days >= 14 && days % 7 === 0
    ? { value: String(days / 7), unit: "weeks" }
    : { value: String(days), unit: "days" };
}

/**
 * The farm's vaccination programme, one dose per row.
 *
 * Empty by default, deliberately: LayerFlow ships no preset programme. The
 * farm copies in what its vet gave it, and the app does the date math.
 */
export function ScheduleEditor({ items }: { items: ScheduleItemEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(NEW);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = items.find((item) => item.id === selected) ?? null;

  const [vaccineName, setVaccineName] = useState("");
  const [ageValue, setAgeValue] = useState("");
  const [ageUnit, setAgeUnit] = useState<"days" | "weeks">("days");
  const [notes, setNotes] = useState("");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = items.find((item) => item.id === nextId) ?? null;
    const age = next ? splitAge(next.ageDays) : { value: "", unit: "days" as const };
    setVaccineName(next?.vaccineName ?? "");
    setAgeValue(age.value);
    setAgeUnit(age.unit);
    setNotes(next?.notes ?? "");
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const values = { vaccineName, ageValue, ageUnit, notes };
      const result = editing
        ? await safeAction(() => updateScheduleItemAction(editing.id, values))
        : await safeAction(() => createScheduleItemAction(values));

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Dose updated." : "Dose added to the programme.");
      if (!editing) {
        setVaccineName("");
        setAgeValue("");
        setNotes("");
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (
      !window.confirm(
        "Remove this dose from the programme? Vaccinations already recorded are kept."
      )
    ) {
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const result = await safeAction(() => deleteScheduleItemAction(editing.id));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  return (
    <Panel title="Vaccination programme">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted-foreground">
          Copy in the programme your vet gave you, one dose per line. Due dates are worked out
          from each flock&apos;s age.
        </p>

        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {items.length > 0 && (
          <Field label="Dose" htmlFor="schedule-select">
            <Select
              id="schedule-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value={NEW}>+ Add a dose</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatAge(item.ageDays)} · {item.vaccineName}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Vaccine" htmlFor="schedule-name" error={fieldErrors.vaccineName}>
          <Input
            id="schedule-name"
            value={vaccineName}
            onChange={(event) => setVaccineName(event.target.value)}
            aria-invalid={!!fieldErrors.vaccineName}
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Bird age" htmlFor="schedule-age" error={fieldErrors.ageValue}>
            <NumberInput
              id="schedule-age"
              value={ageValue}
              onChange={(event) => setAgeValue(event.target.value)}
              aria-invalid={!!fieldErrors.ageValue}
            />
          </Field>
          <Field label="Unit" htmlFor="schedule-unit">
            <Select
              id="schedule-unit"
              value={ageUnit}
              onChange={(event) => setAgeUnit(event.target.value as "days" | "weeks")}
            >
              <option value="days">days</option>
              <option value="weeks">weeks</option>
            </Select>
          </Field>
        </div>

        <Field
          label="Notes"
          htmlFor="schedule-notes"
          hint="Optional. Route, dose, anything your vet noted."
          error={fieldErrors.notes}
        >
          <Input
            id="schedule-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!vaccineName || !ageValue}>
            <ListPlus className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save dose" : "Add dose"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" loading={pending} onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
              Remove
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
