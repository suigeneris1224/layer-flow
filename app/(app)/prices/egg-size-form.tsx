"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import {
  createEggSizeAction,
  moveEggSizeAction,
  setEggSizeActiveAction,
  updateEggSizeAction,
} from "./actions";

export interface EggSizeOption {
  id: string;
  name: string;
  isActive: boolean;
}

const NEW = "__new__";

/**
 * Add a size, or pick one to rename, reorder, or enable/disable.
 *
 * Same select-driven shape as HouseForm (app/(app)/houses/house-form.tsx) --
 * an egg size has even fewer fields than a house, so a dedicated page per row
 * would be overkill here too. Sizes are never hard-deleted (see
 * setEggSizeActiveAction's comment in ./actions.ts), so there is no delete
 * button, only Disable/Enable.
 */
export function EggSizeForm({ sizes }: { sizes: EggSizeOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(NEW);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = sizes.find((size) => size.id === selected) ?? null;
  const [name, setName] = useState(editing?.name ?? "");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = sizes.find((size) => size.id === nextId) ?? null;
    setName(next?.name ?? "");
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
        ? await safeAction(() => updateEggSizeAction(editing.id, { name }))
        : await safeAction(() => createEggSizeAction({ name }));

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Egg size updated." : "Egg size added.");
      if (!editing) setName("");
      router.refresh();
    });
  }

  function onToggleActive() {
    if (!editing) return;
    setFormError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await safeAction(() => setEggSizeActiveAction(editing.id, !editing.isActive));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setSuccess(editing.isActive ? "Egg size disabled." : "Egg size enabled.");
      router.refresh();
    });
  }

  function onMove(direction: "UP" | "DOWN") {
    if (!editing) return;
    setFormError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await safeAction(() => moveEggSizeAction(editing.id, direction));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const editingIndex = editing ? sizes.findIndex((size) => size.id === editing.id) : -1;

  return (
    <Panel title={editing ? `Edit ${editing.name}` : "Add an egg size"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {sizes.length > 0 && (
          <Field label="Size" htmlFor="egg-size-select">
            <Select
              id="egg-size-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value={NEW}>+ Add a new size</option>
              {sizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.name}
                  {!size.isActive ? " (disabled)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field
          label="Name"
          htmlFor="egg-size-name"
          hint={
            editing
              ? undefined
              : 'E.g. "Peewee" or "Pullet" if you sell undersized or young-hen eggs separately.'
          }
          error={fieldErrors.name}
        >
          <Input
            id="egg-size-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!fieldErrors.name}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!name}>
            <Tags className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Add size"}
          </Button>

          {editing && (
            <>
              <Button
                type="button"
                variant="outline"
                loading={pending}
                disabled={editingIndex <= 0}
                onClick={() => onMove("UP")}
              >
                <ArrowUp className="size-4" aria-hidden />
                Move up
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={pending}
                disabled={editingIndex === -1 || editingIndex >= sizes.length - 1}
                onClick={() => onMove("DOWN")}
              >
                <ArrowDown className="size-4" aria-hidden />
                Move down
              </Button>
              <Button type="button" variant="outline" loading={pending} onClick={onToggleActive}>
                {editing.isActive ? (
                  <>
                    <EyeOff className="size-4" aria-hidden />
                    Disable
                  </>
                ) : (
                  <>
                    <Eye className="size-4" aria-hidden />
                    Enable
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {editing && !editing.isActive && (
          <p className="text-xs text-muted-foreground">
            Disabled sizes are hidden from new production entries, sales and pricing, but their
            history and current inventory stay exactly as they are.
          </p>
        )}
      </form>
    </Panel>
  );
}
