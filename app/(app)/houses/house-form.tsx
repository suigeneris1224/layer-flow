"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { createHouseAction, deleteHouseAction, updateHouseAction } from "./actions";

interface HouseOption {
  id: string;
  name: string;
  capacity: number;
  notes: string;
  flockCount: number;
}

const NEW = "__new__";

/**
 * Add a house, or pick one to edit or delete.
 *
 * One select-driven form rather than per-row inline editing, the same shape
 * as PriceForm's "pick a size, then edit its price" -- familiar, and houses
 * have too few fields to justify a dedicated page per row.
 */
export function HouseForm({ houses, canAdd }: { houses: HouseOption[]; canAdd: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(canAdd ? NEW : (houses[0]?.id ?? NEW));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = houses.find((house) => house.id === selected) ?? null;

  const [name, setName] = useState(editing?.name ?? "");
  const [capacity, setCapacity] = useState(editing ? String(editing.capacity) : "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = houses.find((house) => house.id === nextId) ?? null;
    setName(next?.name ?? "");
    setCapacity(next ? String(next.capacity) : "");
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
      const values = { name, capacity, notes };
      const result = editing
        ? await updateHouseAction(editing.id, values)
        : await createHouseAction(values);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "House updated." : "House added.");
      if (!editing) {
        setName("");
        setCapacity("");
        setNotes("");
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (!window.confirm(`Delete ${editing.name}? This cannot be undone.`)) return;

    setFormError(null);
    startTransition(async () => {
      const result = await deleteHouseAction(editing.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  return (
    <Panel title={editing ? `Edit ${editing.name}` : "Add a house"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {houses.length > 0 && (
          <Field label="House" htmlFor="house-select">
            <Select
              id="house-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              {canAdd && <option value={NEW}>+ Add a new house</option>}
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Name" htmlFor="house-name" error={fieldErrors.name}>
          <Input
            id="house-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!fieldErrors.name}
          />
        </Field>

        <Field
          label="Capacity"
          htmlFor="house-capacity"
          hint="Maximum hens this house can hold."
          error={fieldErrors.capacity}
        >
          <NumberInput
            id="house-capacity"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            aria-invalid={!!fieldErrors.capacity}
          />
        </Field>

        <Field label="Notes" htmlFor="house-notes" hint="Optional." error={fieldErrors.notes}>
          <Textarea
            id="house-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!name || !capacity}>
            <Home className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Add house"}
          </Button>

          {editing && (
            <Button
              type="button"
              variant="outline"
              loading={pending}
              disabled={editing.flockCount > 0}
              onClick={onDelete}
              title={
                editing.flockCount > 0
                  ? "This house has flock history and cannot be deleted."
                  : undefined
              }
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>

        {editing && editing.flockCount > 0 && (
          <p className="text-xs text-muted-foreground">
            This house can&apos;t be deleted — it has{" "}
            {editing.flockCount === 1 ? "a flock" : `${editing.flockCount} flocks`} recorded
            against it, including past ones.
          </p>
        )}

        {!editing && !canAdd && (
          <p className="text-xs text-muted-foreground">
            You&apos;ve reached your plan&apos;s house limit — editing existing houses is still
            available above.
          </p>
        )}
      </form>
    </Panel>
  );
}
