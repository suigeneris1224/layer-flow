"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import { currencySymbol } from "@/lib/format";
import type { IngredientEntry } from "@/lib/data/feed-formulas";
import { deleteIngredientAction, saveIngredientAction } from "./actions";

const NEW = "__new__";

function str(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

/**
 * The farm's own ingredient list. Nutrient values come from the supplier's
 * label or the farm's nutritionist -- LayerFlow ships none.
 */
export function IngredientForm({
  ingredients,
  currency,
}: {
  ingredients: IngredientEntry[];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(NEW);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = ingredients.find((ingredient) => ingredient.id === selected) ?? null;

  const [name, setName] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [proteinPct, setProteinPct] = useState("");
  const [energyKcalPerKg, setEnergyKcalPerKg] = useState("");
  const [calciumPct, setCalciumPct] = useState("");
  const [phosphorusPct, setPhosphorusPct] = useState("");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = ingredients.find((ingredient) => ingredient.id === nextId);
    setName(next?.name ?? "");
    setPricePerKg(str(next?.pricePerKg));
    setProteinPct(str(next?.proteinPct));
    setEnergyKcalPerKg(str(next?.energyKcalPerKg));
    setCalciumPct(str(next?.calciumPct));
    setPhosphorusPct(str(next?.phosphorusPct));
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
      const result = await safeAction(() =>
        saveIngredientAction(editing?.id ?? null, {
          name,
          pricePerKg: pricePerKg || "0",
          proteinPct: proteinPct || "0",
          energyKcalPerKg: energyKcalPerKg || "0",
          calciumPct: calciumPct || "0",
          phosphorusPct: phosphorusPct || "0",
        })
      );

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Ingredient updated." : "Ingredient added.");
      if (!editing) onSelect(NEW);
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (!window.confirm(`Delete ${editing.name}?`)) return;
    setFormError(null);
    startTransition(async () => {
      const result = await safeAction(() => deleteIngredientAction(editing.id));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  const symbol = currencySymbol(currency);

  return (
    <Panel title={editing ? `Edit ${editing.name}` : "Add an ingredient"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted-foreground">
          Use the values on your supplier&apos;s label, or the ones your nutritionist or vet gave
          you.
        </p>

        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {ingredients.length > 0 && (
          <Field label="Ingredient" htmlFor="ingredient-select">
            <Select
              id="ingredient-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value={NEW}>+ Add an ingredient</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Name" htmlFor="ingredient-name" error={fieldErrors.name}>
          <Input
            id="ingredient-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!fieldErrors.name}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price per kg" htmlFor="ingredient-price" error={fieldErrors.pricePerKg}>
            <NumberInput
              id="ingredient-price"
              adornment={symbol}
              value={pricePerKg}
              onChange={(event) => setPricePerKg(event.target.value)}
            />
          </Field>
          <Field label="Crude protein (%)" htmlFor="ingredient-protein" error={fieldErrors.proteinPct}>
            <NumberInput
              id="ingredient-protein"
              value={proteinPct}
              onChange={(event) => setProteinPct(event.target.value)}
            />
          </Field>
          <Field
            label="Energy (kcal ME/kg)"
            htmlFor="ingredient-energy"
            error={fieldErrors.energyKcalPerKg}
          >
            <NumberInput
              id="ingredient-energy"
              value={energyKcalPerKg}
              onChange={(event) => setEnergyKcalPerKg(event.target.value)}
            />
          </Field>
          <Field label="Calcium (%)" htmlFor="ingredient-calcium" error={fieldErrors.calciumPct}>
            <NumberInput
              id="ingredient-calcium"
              value={calciumPct}
              onChange={(event) => setCalciumPct(event.target.value)}
            />
          </Field>
          <Field
            label="Phosphorus (%)"
            htmlFor="ingredient-phosphorus"
            error={fieldErrors.phosphorusPct}
          >
            <NumberInput
              id="ingredient-phosphorus"
              value={phosphorusPct}
              onChange={(event) => setPhosphorusPct(event.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!name}>
            <Save className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Add ingredient"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              loading={pending}
              onClick={onDelete}
              disabled={editing.usedIn > 0}
              title={editing.usedIn > 0 ? "Used in a formula" : undefined}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>
        {editing && editing.usedIn > 0 && (
          <p className="text-xs text-muted-foreground">
            Used in {editing.usedIn} {editing.usedIn === 1 ? "formula" : "formulas"}, so it
            can&apos;t be deleted.
          </p>
        )}
      </form>
    </Panel>
  );
}
