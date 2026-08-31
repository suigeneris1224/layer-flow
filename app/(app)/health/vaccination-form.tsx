"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Syringe, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { StatusNote } from "@/components/ui/states";
import type { VaccinationEntry } from "@/lib/data/health";
import type { FlockChoice } from "./flock-choice";
import {
  deleteVaccinationAction,
  recordVaccinationAction,
  updateVaccinationAction,
} from "./actions";

const NEW = "__new__";

/**
 * A log, not a schedule.
 *
 * LayerFlow records what the farmer says was given. It suggests no vaccine and
 * no interval: programmes vary by region, hatchery and disease pressure, and
 * that is a decision for their vet.
 */
export function VaccinationForm({
  records,
  flocks,
  today,
}: {
  records: VaccinationEntry[];
  flocks: FlockChoice[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(NEW);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = records.find((record) => record.id === selected) ?? null;

  const [flockId, setFlockId] = useState(flocks[0]?.id ?? "");
  const [vaccinationDate, setVaccinationDate] = useState(today);
  const [vaccineName, setVaccineName] = useState("");
  const [notes, setNotes] = useState("");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = records.find((record) => record.id === nextId) ?? null;
    setFlockId(next?.flockId ?? flocks[0]?.id ?? "");
    setVaccinationDate(next?.vaccinationDate ?? today);
    setVaccineName(next?.vaccineName ?? "");
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
      const values = { flockId, vaccinationDate, vaccineName, notes };
      const result = editing
        ? await updateVaccinationAction(editing.id, values)
        : await recordVaccinationAction(values);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Record updated." : "Vaccination recorded.");
      if (!editing) {
        setVaccineName("");
        setNotes("");
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (!window.confirm("Delete this vaccination record? This cannot be undone.")) return;

    setFormError(null);
    startTransition(async () => {
      const result = await deleteVaccinationAction(editing.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  return (
    <Panel title={editing ? "Edit this record" : "Record a vaccination"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {records.length > 0 && (
          <Field label="Record" htmlFor="vaccination-select">
            <Select
              id="vaccination-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value={NEW}>+ Record a new vaccination</option>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.vaccinationDate} · {record.flockName} · {record.vaccineName}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Flock" htmlFor="vaccination-flock" error={fieldErrors.flockId}>
          <Select
            id="vaccination-flock"
            value={flockId}
            onChange={(event) => setFlockId(event.target.value)}
          >
            {flocks.map((flock) => (
              <option key={flock.id} value={flock.id}>
                {flock.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Date"
          htmlFor="vaccination-date"
          error={fieldErrors.vaccinationDate}
        >
          <DateField
            id="vaccination-date"
            max={today}
            today={today}
            value={vaccinationDate}
            onChange={setVaccinationDate}
            invalid={!!fieldErrors.vaccinationDate}
          />
        </Field>

        <Field
          label="Vaccine"
          htmlFor="vaccination-name"
          hint="Whatever it says on the vial."
          error={fieldErrors.vaccineName}
        >
          <Input
            id="vaccination-name"
            value={vaccineName}
            onChange={(event) => setVaccineName(event.target.value)}
            aria-invalid={!!fieldErrors.vaccineName}
          />
        </Field>

        <Field
          label="Notes"
          htmlFor="vaccination-notes"
          hint="Optional. Dose, batch, who administered it."
          error={fieldErrors.notes}
        >
          <Textarea
            id="vaccination-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!flockId || !vaccineName}>
            <Syringe className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Record vaccination"}
          </Button>

          {editing && (
            <Button type="button" variant="outline" loading={pending} onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
