"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formulaTotals, pearsonSquare } from "@/lib/domain/feed-formulation";
import type { FormulaEntry, IngredientEntry } from "@/lib/data/feed-formulas";
import { deleteFormulaAction, saveFormulaAction } from "./actions";

const NEW = "__new__";

interface LineState {
  key: number;
  ingredientId: string;
  percent: string;
}

let nextKey = 1;
const blankLine = (ingredientId = ""): LineState => ({ key: nextKey++, ingredientId, percent: "" });

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const str = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

/** Actual vs target, so the farmer sees how close the mix is to what they aimed for. */
function TargetRow({
  label,
  actual,
  target,
  unit,
}: {
  label: string;
  actual: number;
  target: number | null;
  unit: string;
}) {
  const diff = target === null ? null : actual - target;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">
        <span className="font-semibold">
          {formatNumber(actual, unit === "%" ? 2 : 0)}
          {unit}
        </span>
        {target !== null && diff !== null && (
          <span className="ml-2 text-xs text-muted-foreground">
            target {formatNumber(target, unit === "%" ? 2 : 0)}
            {unit} ({diff >= 0 ? "+" : ""}
            {formatNumber(diff, unit === "%" ? 2 : 0)})
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Build a mix from the farm's own ingredients and see its nutrients and cost
 * per kg update as you type. No optimiser and no suggested recipe: the farmer
 * sets the shares; the optional "Balance protein" helper is the two-ingredient
 * Pearson square they already know from extension trainings.
 */
export function FormulaEditor({
  formulas,
  ingredients,
  currency,
}: {
  formulas: FormulaEntry[];
  ingredients: IngredientEntry[];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(NEW);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = formulas.find((formula) => formula.id === selected) ?? null;

  const [name, setName] = useState("");
  const [batchKg, setBatchKg] = useState("100");
  const [targetProteinPct, setTargetProteinPct] = useState("");
  const [targetEnergy, setTargetEnergy] = useState("");
  const [targetCalciumPct, setTargetCalciumPct] = useState("");
  const [lines, setLines] = useState<LineState[]>([blankLine(), blankLine()]);

  // Pearson helper state.
  const [balanceA, setBalanceA] = useState("");
  const [balanceB, setBalanceB] = useState("");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = formulas.find((formula) => formula.id === nextId) ?? null;
    setName(next?.name ?? "");
    setBatchKg(next ? String(next.batchKg) : "100");
    setTargetProteinPct(str(next?.targetProteinPct));
    setTargetEnergy(str(next?.targetEnergy));
    setTargetCalciumPct(str(next?.targetCalciumPct));
    setLines(
      next && next.lines.length > 0
        ? next.lines.map((line) => ({
            key: nextKey++,
            ingredientId: line.ingredientId,
            percent: String(line.percent),
          }))
        : [blankLine(), blankLine()]
    );
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);
  }

  const parsedLines = lines
    .filter((line) => line.ingredientId && toNumber(line.percent) > 0)
    .map((line) => ({ ingredientId: line.ingredientId, percent: toNumber(line.percent) }));

  const totals = useMemo(
    () => formulaTotals(parsedLines, ingredients, toNumber(batchKg) || 0),
    // parsedLines is derived from lines each render; key on its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, ingredients, batchKg]
  );

  const target = (value: string) => (value === "" ? null : toNumber(value));
  const proteinTarget = target(targetProteinPct);

  const ingredientA = ingredients.find((ingredient) => ingredient.id === balanceA);
  const ingredientB = ingredients.find((ingredient) => ingredient.id === balanceB);
  const balance =
    ingredientA && ingredientB && proteinTarget !== null
      ? pearsonSquare(ingredientA.proteinPct, ingredientB.proteinPct, proteinTarget)
      : null;

  function applyBalance() {
    if (!balance || !ingredientA || !ingredientB) return;
    setLines([
      { key: nextKey++, ingredientId: ingredientA.id, percent: String(balance.lowPercent) },
      { key: nextKey++, ingredientId: ingredientB.id, percent: String(balance.highPercent) },
    ]);
  }

  function updateLine(key: number, patch: Partial<LineState>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const result = await safeAction(() =>
        saveFormulaAction(editing?.id ?? null, {
          name,
          batchKg,
          targetProteinPct,
          targetEnergy,
          targetCalciumPct,
          items: parsedLines,
        })
      );

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Formula saved." : "Formula created.");
      if (!editing) setSelected(result.data.id);
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (!window.confirm(`Delete the ${editing.name} formula? Past feed records keep its name.`)) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await safeAction(() => deleteFormulaAction(editing.id));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  if (ingredients.length === 0) {
    return (
      <Panel title="Formulas">
        <p className="text-sm text-muted-foreground">
          Add your ingredients first (the Ingredients tab), then build a formula from them.
        </p>
      </Panel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="contents" noValidate>
      <Panel title={editing ? `Edit ${editing.name}` : "New formula"} bodyClassName="flex flex-col gap-4">
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {formulas.length > 0 && (
          <Field label="Formula" htmlFor="formula-select">
            <Select
              id="formula-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value={NEW}>+ New formula</option>
              {formulas.map((formula) => (
                <option key={formula.id} value={formula.id}>
                  {formula.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Name" htmlFor="formula-name" error={fieldErrors.name}>
            <Input
              id="formula-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
          </Field>
          <Field label="Batch size (kg)" htmlFor="formula-batch" error={fieldErrors.batchKg}>
            <NumberInput
              id="formula-batch"
              value={batchKg}
              onChange={(event) => setBatchKg(event.target.value)}
            />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Ingredients</legend>
          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
              <Select
                aria-label="Ingredient"
                value={line.ingredientId}
                onChange={(event) => updateLine(line.key, { ingredientId: event.target.value })}
              >
                <option value="">Choose…</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </Select>
              <NumberInput
                aria-label="Share of the mix"
                adornment="%"
                value={line.percent}
                onChange={(event) => updateLine(line.key, { percent: event.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Remove line"
                onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                disabled={lines.length <= 1}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setLines((current) => [...current, blankLine()])}
          >
            <Plus className="size-4" aria-hidden />
            Add ingredient
          </Button>
          {fieldErrors.items && <p className="text-sm text-destructive">{fieldErrors.items}</p>}
          <p
            className={
              totals.isComplete
                ? "text-xs text-muted-foreground"
                : "text-xs font-medium text-[hsl(var(--status-warn))]"
            }
          >
            Total {formatNumber(totals.totalPercent, 2)}%
            {!totals.isComplete && " — the shares need to add up to 100%"}
          </p>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!name || !totals.isComplete}>
            <Save className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save formula" : "Create formula"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" loading={pending} onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="This mix">
          <TargetRow label="Crude protein" actual={totals.proteinPct} target={proteinTarget} unit="%" />
          <TargetRow
            label="Energy (kcal/kg)"
            actual={totals.energyKcalPerKg}
            target={target(targetEnergy)}
            unit=""
          />
          <TargetRow
            label="Calcium"
            actual={totals.calciumPct}
            target={target(targetCalciumPct)}
            unit="%"
          />
          <TargetRow label="Phosphorus" actual={totals.phosphorusPct} target={null} unit="%" />
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Cost per kg</span>
            <span className="text-lg font-semibold tabular">
              {formatCurrency(totals.costPerKg, currency)}
            </span>
          </div>

          {totals.batch.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                For a {formatNumber(toNumber(batchKg), 1)} kg batch
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {totals.batch.map((line) => (
                  <li key={line.ingredientId} className="flex justify-between gap-3 tabular">
                    <span>{line.name}</span>
                    <span>
                      {formatNumber(line.kg, 2)} kg · {formatCurrency(line.cost, currency)}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between gap-3 border-t border-border pt-1 font-semibold tabular">
                  <span>Total</span>
                  <span>{formatCurrency(totals.batchCost, currency)}</span>
                </li>
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Targets" bodyClassName="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Optional. Use the targets from your nutritionist or feed supplier for this stage.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Protein %" htmlFor="target-protein" error={fieldErrors.targetProteinPct}>
              <NumberInput
                id="target-protein"
                value={targetProteinPct}
                onChange={(event) => setTargetProteinPct(event.target.value)}
              />
            </Field>
            <Field label="kcal/kg" htmlFor="target-energy" error={fieldErrors.targetEnergy}>
              <NumberInput
                id="target-energy"
                value={targetEnergy}
                onChange={(event) => setTargetEnergy(event.target.value)}
              />
            </Field>
            <Field label="Calcium %" htmlFor="target-calcium" error={fieldErrors.targetCalciumPct}>
              <NumberInput
                id="target-calcium"
                value={targetCalciumPct}
                onChange={(event) => setTargetCalciumPct(event.target.value)}
              />
            </Field>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              Balance protein between two ingredients
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                The Pearson square: pick a lower- and a higher-protein ingredient and LayerFlow
                works out the shares that hit your protein target. It replaces the lines above.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label="First ingredient" value={balanceA} onChange={(e) => setBalanceA(e.target.value)}>
                  <option value="">Choose…</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({formatNumber(ingredient.proteinPct, 1)}%)
                    </option>
                  ))}
                </Select>
                <Select aria-label="Second ingredient" value={balanceB} onChange={(e) => setBalanceB(e.target.value)}>
                  <option value="">Choose…</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({formatNumber(ingredient.proteinPct, 1)}%)
                    </option>
                  ))}
                </Select>
              </div>
              {proteinTarget === null ? (
                <p className="text-xs text-muted-foreground">Set a protein target first.</p>
              ) : ingredientA && ingredientB && !balance ? (
                <p className="text-xs text-[hsl(var(--status-warn))]">
                  {formatNumber(proteinTarget, 1)}% isn&apos;t between these two ingredients, so no
                  mix of them can reach it.
                </p>
              ) : balance && ingredientA && ingredientB ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm tabular">
                    {ingredientA.name} {formatNumber(balance.lowPercent, 2)}% ·{" "}
                    {ingredientB.name} {formatNumber(balance.highPercent, 2)}%
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={applyBalance}>
                    <Scale className="size-4" aria-hidden />
                    Use this mix
                  </Button>
                </div>
              ) : null}
            </div>
          </details>
        </Panel>
      </div>
    </form>
  );
}
