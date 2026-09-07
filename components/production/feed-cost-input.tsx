"use client";

import { useState } from "react";
import { Field, NumberInput, Select } from "@/components/ui/field";
import { costPerKgFromSack } from "@/lib/domain/calculations";
import { currencySymbol, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRESETS = ["25", "50"] as const;
const OTHER = "other";

type SackChoice = (typeof PRESETS)[number] | typeof OTHER;

export interface FeedCostValue {
  costPerKg: string;
  sackSizeKg: string;
  sackPrice: string;
}

/**
 * How feed cost gets typed in: a raw cost-per-kg, or a sack price + size that
 * this computes cost-per-kg from.
 *
 * Presentation only -- the parent form (react-hook-form in production-form,
 * plain state in feed-form) still owns the three underlying values and their
 * validation/derived-total logic, so `feedCost(kg, costPerKg)` keeps working
 * unchanged regardless of which mode was used to arrive at it.
 *
 * Mount with a `key` that changes whenever the record being edited changes
 * (e.g. `${flockId}-${date}`, or the selected record id) -- the initial mode
 * is decided once, from whether sack values are already present, and a prop
 * change alone won't re-derive it.
 */
export function FeedCostInput({
  value,
  onChange,
  currency,
  costPerKgError,
  sackSizeKgError,
  sackPriceError,
}: {
  value: FeedCostValue;
  onChange: (next: FeedCostValue) => void;
  currency: string;
  costPerKgError?: string;
  sackSizeKgError?: string;
  sackPriceError?: string;
}) {
  const [mode, setMode] = useState<"perKg" | "sack">(
    value.sackSizeKg || value.sackPrice ? "sack" : "perKg"
  );
  const [sackChoice, setSackChoice] = useState<SackChoice>(
    PRESETS.includes(value.sackSizeKg as (typeof PRESETS)[number])
      ? (value.sackSizeKg as (typeof PRESETS)[number])
      : OTHER
  );

  function toPerKgMode() {
    setMode("perKg");
    onChange({ ...value, sackSizeKg: "", sackPrice: "" });
  }

  function toSackMode() {
    setMode("sack");
    const sizeKg = sackChoice === OTHER ? value.sackSizeKg : sackChoice;
    const computed = costPerKgFromSack(Number(value.sackPrice) || 0, Number(sizeKg) || 0);
    onChange({
      costPerKg: computed > 0 ? String(computed) : "",
      sackSizeKg: sizeKg,
      sackPrice: value.sackPrice,
    });
  }

  function onSackFieldChange(sizeKg: string, price: string) {
    const computed = costPerKgFromSack(Number(price) || 0, Number(sizeKg) || 0);
    onChange({
      costPerKg: computed > 0 ? String(computed) : "",
      sackSizeKg: sizeKg,
      sackPrice: price,
    });
  }

  const computedCostPerKg = costPerKgFromSack(
    Number(value.sackPrice) || 0,
    Number(value.sackSizeKg) || 0
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        <ModeButton active={mode === "perKg"} onClick={toPerKgMode}>
          Cost per kg
        </ModeButton>
        <ModeButton active={mode === "sack"} onClick={toSackMode}>
          By sack
        </ModeButton>
      </div>

      {mode === "perKg" ? (
        <Field label="Feed cost per kg" htmlFor="feed-cost-per-kg" error={costPerKgError}>
          <NumberInput
            id="feed-cost-per-kg"
            min={0}
            step="0.01"
            placeholder="0"
            adornment={currencySymbol(currency)}
            value={value.costPerKg}
            onChange={(event) => onChange({ ...value, costPerKg: event.target.value })}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sack size" htmlFor="sack-size" error={sackSizeKgError}>
            <Select
              id="sack-size"
              value={sackChoice}
              onChange={(event) => {
                const next = event.target.value as SackChoice;
                setSackChoice(next);
                onSackFieldChange(next === OTHER ? "" : next, value.sackPrice);
              }}
            >
              {PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset} kg
                </option>
              ))}
              <option value={OTHER}>Other</option>
            </Select>
          </Field>

          <Field label="Sack price" htmlFor="sack-price" error={sackPriceError}>
            <NumberInput
              id="sack-price"
              min={0}
              step="0.01"
              placeholder="0"
              adornment={currencySymbol(currency)}
              value={value.sackPrice}
              onChange={(event) => onSackFieldChange(value.sackSizeKg, event.target.value)}
            />
          </Field>

          {sackChoice === OTHER && (
            <Field label="Custom sack size (kg)" htmlFor="sack-size-custom" className="col-span-2">
              <NumberInput
                id="sack-size-custom"
                min={0}
                step="0.1"
                placeholder="0"
                value={value.sackSizeKg}
                onChange={(event) => onSackFieldChange(event.target.value, value.sackPrice)}
              />
            </Field>
          )}

          {computedCostPerKg > 0 && (
            <p className="col-span-2 text-xs text-muted-foreground">
              ≈ {formatCurrency(computedCostPerKg, currency)}/kg
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary font-medium text-primary-foreground"
          : "border-input bg-surface hover:border-foreground/30 hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
