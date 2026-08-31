"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { StatusNote } from "@/components/ui/states";
import type { FlockStatus } from "@/lib/types/database";
import { createFlockAction, retireFlockAction, updateFlockAction } from "./actions";

interface FlockOption {
  id: string;
  name: string;
  breed: string;
  houseId: string;
  initialHens: number;
  currentHens: number;
  placementDate: string;
  startLayingDate: string | null;
  status: FlockStatus;
  notes: string;
}

interface HouseOption {
  id: string;
  name: string;
}

const NEW = "__new__";
const ACTIVE_STATUSES: FlockStatus[] = ["GROWING", "PRODUCING"];

/**
 * Add a flock, edit one, or retire it.
 *
 * Select-driven like HouseForm and PriceForm. `initialHens` only appears when
 * adding a flock -- it anchors the mortality math and is not editable after
 * the fact. Retiring lives in its own panel below, since it is a one-way
 * status change with its own confirmation, not a field on this form.
 */
export function FlockForm({
  flocks,
  houses,
  canAdd,
}: {
  flocks: FlockOption[];
  houses: HouseOption[];
  canAdd: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(canAdd ? NEW : (flocks[0]?.id ?? NEW));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = flocks.find((flock) => flock.id === selected) ?? null;

  const [name, setName] = useState(editing?.name ?? "");
  const [breed, setBreed] = useState(editing?.breed ?? "");
  const [houseId, setHouseId] = useState(editing?.houseId ?? houses[0]?.id ?? "");
  const [initialHens, setInitialHens] = useState(editing ? String(editing.initialHens) : "");
  const [placementDate, setPlacementDate] = useState(editing?.placementDate ?? "");
  const [startLayingDate, setStartLayingDate] = useState(editing?.startLayingDate ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const [retireStatus, setRetireStatus] = useState<"SOLD" | "CLOSED">("SOLD");
  const [retireNotes, setRetireNotes] = useState("");

  function resetFrom(flock: FlockOption | null) {
    setName(flock?.name ?? "");
    setBreed(flock?.breed ?? "");
    setHouseId(flock?.houseId ?? houses[0]?.id ?? "");
    setInitialHens(flock ? String(flock.initialHens) : "");
    setPlacementDate(flock?.placementDate ?? "");
    setStartLayingDate(flock?.startLayingDate ?? "");
    setNotes(flock?.notes ?? "");
    setRetireNotes("");
    setRetireStatus("SOLD");
  }

  function onSelect(nextId: string) {
    setSelected(nextId);
    resetFrom(flocks.find((flock) => flock.id === nextId) ?? null);
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
      const result = editing
        ? await updateFlockAction(editing.id, {
            name,
            breed,
            houseId,
            placementDate,
            startLayingDate,
            notes,
          })
        : await createFlockAction({
            name,
            breed,
            houseId,
            initialHens,
            placementDate,
            startLayingDate,
            notes,
          });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Flock updated." : "Flock added.");
      if (!editing) resetFrom(null);
      router.refresh();
    });
  }

  function onRetire() {
    if (!editing) return;
    const verb = retireStatus === "SOLD" ? "sold" : "closed";
    if (!window.confirm(`Mark ${editing.name} as ${verb}? This cannot be undone.`)) return;

    setFormError(null);
    startTransition(async () => {
      const result = await retireFlockAction(editing.id, {
        status: retireStatus,
        notes: retireNotes,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setSuccess(`${editing.name} marked as ${verb}.`);
      router.refresh();
    });
  }

  const canRetire = editing !== null && ACTIVE_STATUSES.includes(editing.status);

  return (
    <>
      <Panel title={editing ? `Edit ${editing.name}` : "Add a flock"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError && <StatusNote tone="bad">{formError}</StatusNote>}
          {success && <StatusNote tone="good">{success}</StatusNote>}

          {flocks.length > 0 && (
            <Field label="Flock" htmlFor="flock-select">
              <Select
                id="flock-select"
                value={selected}
                onChange={(event) => onSelect(event.target.value)}
              >
                {canAdd && <option value={NEW}>+ Add a new flock</option>}
                {flocks.map((flock) => (
                  <option key={flock.id} value={flock.id}>
                    {flock.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Name" htmlFor="flock-name" error={fieldErrors.name}>
            <Input
              id="flock-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
          </Field>

          <Field label="Breed" htmlFor="flock-breed" hint="Optional." error={fieldErrors.breed}>
            <Input id="flock-breed" value={breed} onChange={(event) => setBreed(event.target.value)} />
          </Field>

          <Field label="House" htmlFor="flock-house" error={fieldErrors.houseId}>
            <Select
              id="flock-house"
              value={houseId}
              onChange={(event) => setHouseId(event.target.value)}
            >
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </Select>
          </Field>

          {!editing && (
            <Field
              label="Number of hens"
              htmlFor="flock-hens"
              error={fieldErrors.initialHens}
            >
              <NumberInput
                id="flock-hens"
                min={1}
                value={initialHens}
                onChange={(event) => setInitialHens(event.target.value)}
                aria-invalid={!!fieldErrors.initialHens}
              />
            </Field>
          )}

          {/*
            Stacked until sm. Two columns on a 375px phone leave each date
            field 148px, and the OS date input needs about 180px for
            dd/mm/yyyy plus its picker icon -- the icon is the part that gets
            clipped, which is the part you tap.
          */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Placement date"
              htmlFor="flock-placement"
              error={fieldErrors.placementDate}
            >
              <DateField
                id="flock-placement"
                value={placementDate}
                onChange={setPlacementDate}
                invalid={!!fieldErrors.placementDate}
              />
            </Field>

            <Field
              label="Start laying date"
              htmlFor="flock-laying"
              hint="Leave blank if not laying yet."
              error={fieldErrors.startLayingDate}
            >
              <DateField
                id="flock-laying"
                value={startLayingDate}
                onChange={setStartLayingDate}
                invalid={!!fieldErrors.startLayingDate}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="flock-notes" hint="Optional." error={fieldErrors.notes}>
            <Textarea
              id="flock-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <Button
            type="submit"
            loading={pending}
            disabled={!name || !houseId || !placementDate || (!editing && !initialHens)}
          >
            <Layers className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Add flock"}
          </Button>

          {!editing && !canAdd && (
            <p className="text-xs text-muted-foreground">
              You&apos;ve reached your plan&apos;s active flock limit — editing existing flocks is
              still available above.
            </p>
          )}
        </form>
      </Panel>

      {canRetire && editing && (
        <Panel title="Retire this flock">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Mark {editing.name} as sold or closed once it stops producing. The hens it started
              with, and its production history, stay on record.
            </p>

            <Field label="Outcome" htmlFor="retire-status">
              <Select
                id="retire-status"
                value={retireStatus}
                onChange={(event) => setRetireStatus(event.target.value as "SOLD" | "CLOSED")}
              >
                <option value="SOLD">Sold</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </Field>

            <Field label="Notes" htmlFor="retire-notes" hint="Optional.">
              <Textarea
                id="retire-notes"
                value={retireNotes}
                onChange={(event) => setRetireNotes(event.target.value)}
              />
            </Field>

            <Button type="button" variant="destructive" loading={pending} onClick={onRetire}>
              Mark as {retireStatus === "SOLD" ? "sold" : "closed"}
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}
