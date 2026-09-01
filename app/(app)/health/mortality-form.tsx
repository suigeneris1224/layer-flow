"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartCrack, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { StatusNote } from "@/components/ui/states";
import type { MortalityEntry } from "@/lib/data/health";
import type { FlockChoice } from "./flock-choice";
import {
  deleteMortalityAction,
  recordMortalityAction,
  updateMortalityAction,
} from "./actions";
import { mortalityRecordSchema, toFieldErrors } from "@/lib/validation/schemas";
import { useConnectivity } from "@/lib/offline/use-connectivity";
import { enqueueWrite, generateWriteId } from "@/lib/offline/queue";

const NEW = "__new__";

/**
 * Log a loss that did not happen on a collection day.
 *
 * Same select-driven shape as CustomerForm. Only ad-hoc records reach this
 * form -- the row a daily production entry owns is edited on that day's form,
 * because saving the day rewrites it anyway.
 */
export function MortalityForm({
  records,
  flocks,
  today,
  offlineEnabled,
}: {
  records: MortalityEntry[];
  flocks: FlockChoice[];
  today: string;
  /** Whether the farm's plan includes offline recording (lib/offline/). */
  offlineEnabled: boolean;
}) {
  const router = useRouter();
  const online = useConnectivity();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(NEW);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = records.find((record) => record.id === selected) ?? null;

  const [flockId, setFlockId] = useState(flocks[0]?.id ?? "");
  const [recordDate, setRecordDate] = useState(today);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = records.find((record) => record.id === nextId) ?? null;
    setFlockId(next?.flockId ?? flocks[0]?.id ?? "");
    setRecordDate(next?.recordDate ?? today);
    setQuantity(next ? String(next.quantity) : "");
    setReason(next?.reason ?? "");
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

    const values = { flockId, recordDate, quantity, reason, notes };

    /*
     * Offline queueing only covers a brand-new record (docs/offline-sync.md's
     * scope) -- editing or deleting an existing one needs the server anyway
     * to know what it's replacing, so those still go through the network path
     * and fail normally when there's no connection.
     */
    if (!editing && !online && offlineEnabled) {
      const parsed = mortalityRecordSchema.safeParse(values);
      if (!parsed.success) {
        setFieldErrors(toFieldErrors(parsed.error));
        setFormError("Please check the form below.");
        return;
      }

      startTransition(async () => {
        const clientId = generateWriteId();
        await enqueueWrite({
          id: clientId,
          kind: "mortality",
          payload: { ...parsed.data, clientId },
        });
        setSuccess("Saved. It will sync when you have signal.");
        setQuantity("");
        setReason("");
        setNotes("");
      });
      return;
    }

    startTransition(async () => {
      const result = editing
        ? await updateMortalityAction(editing.id, values)
        : await recordMortalityAction(values);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Record updated." : "Record saved.");
      if (!editing) {
        setQuantity("");
        setReason("");
        setNotes("");
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (!window.confirm("Delete this record? The hen count will go back up.")) return;

    setFormError(null);
    startTransition(async () => {
      const result = await deleteMortalityAction(editing.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  return (
    <Panel title={editing ? "Edit this record" : "Record a loss"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {records.length > 0 && (
          <Field label="Record" htmlFor="mortality-select">
            <Select
              id="mortality-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value={NEW}>+ Record a new loss</option>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.recordDate} · {record.flockName} · {record.quantity}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Flock" htmlFor="mortality-flock" error={fieldErrors.flockId}>
          <Select
            id="mortality-flock"
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

        <Field label="Date" htmlFor="mortality-date" error={fieldErrors.recordDate}>
          <DateField
            id="mortality-date"
            max={today}
            today={today}
            value={recordDate}
            onChange={setRecordDate}
            invalid={!!fieldErrors.recordDate}
          />
        </Field>

        <Field
          label="Birds lost"
          htmlFor="mortality-quantity"
          error={fieldErrors.quantity}
        >
          <NumberInput
            id="mortality-quantity"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={!!fieldErrors.quantity}
          />
        </Field>

        <Field
          label="Reason"
          htmlFor="mortality-reason"
          hint="Optional. Heat, predator, illness — whatever you saw."
          error={fieldErrors.reason}
        >
          <Input
            id="mortality-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <Field
          label="Notes"
          htmlFor="mortality-notes"
          hint="Optional."
          error={fieldErrors.notes}
        >
          <Textarea
            id="mortality-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!flockId || !quantity}>
            <HeartCrack className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Record loss"}
          </Button>

          {editing && (
            <Button type="button" variant="outline" loading={pending} onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The flock&apos;s hen count updates on its own from these records.
        </p>
      </form>
    </Panel>
  );
}
