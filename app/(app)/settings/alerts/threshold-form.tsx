"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, NumberInput } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { THRESHOLDS, type AlertThresholdOverrides } from "@/lib/domain/alerts";
import { saveAlertThresholdsAction } from "./actions";

interface ThresholdField {
  key: keyof AlertThresholdOverrides;
  label: string;
  hint: string;
  step: string;
  defaultValue: number;
}

/**
 * Percentage/fraction fields on `THRESHOLDS` are stored and edited as
 * whole-number percentages (10, not 0.1) -- the fraction is an
 * implementation detail of the domain layer, not something a farmer should
 * have to type.
 */
const FIELDS: ThresholdField[] = [
  {
    key: "productionDrop",
    label: "Production drop",
    hint: "Percent below your recent average before we mention it.",
    step: "1",
    defaultValue: THRESHOLDS.productionDrop * 100,
  },
  {
    key: "feedCostRise",
    label: "Feed cost rise",
    hint: "Percent above your recent average before we mention it.",
    step: "1",
    defaultValue: THRESHOLDS.feedCostRise * 100,
  },
  {
    key: "dailyMortalityRate",
    label: "Daily mortality rate",
    hint: "Percent of the flock lost in a day before we speak up.",
    step: "0.1",
    defaultValue: THRESHOLDS.dailyMortalityRate * 100,
  },
  {
    key: "eggSizeShift",
    label: "Egg size shift",
    hint: "Percentage-point shift in a size's share before we mention it.",
    step: "1",
    defaultValue: THRESHOLDS.eggSizeShift,
  },
  {
    key: "vaccinationGapDays",
    label: "Vaccination gap (days)",
    hint: "Days since the last vaccination before we mention it.",
    step: "1",
    defaultValue: THRESHOLDS.vaccinationGapDays,
  },
  {
    key: "lowInventoryTrays",
    label: "Low inventory (trays)",
    hint: "Trays on hand at or below which we flag low stock.",
    step: "1",
    defaultValue: THRESHOLDS.lowInventoryTrays,
  },
  {
    key: "stalePricingDays",
    label: "Stale pricing (days)",
    hint: "Days since a price last changed before we call it stale.",
    step: "1",
    defaultValue: THRESHOLDS.stalePricingDays,
  },
  {
    key: "underperformancePct",
    label: "Flock underperformance",
    hint: "Percent below your farm average laying rate before we flag a flock.",
    step: "1",
    defaultValue: THRESHOLDS.underperformancePct,
  },
  {
    key: "lossThresholdPesos",
    label: "Weekly loss (₱)",
    hint: "A flock must lose at least this much in a week before we mention it. 0 = any loss.",
    step: "1",
    defaultValue: THRESHOLDS.lossThresholdPesos,
  },
];

/** Fields stored as a fraction (0.1) but edited as a whole percent (10). */
const PERCENT_TO_FRACTION: Partial<Record<keyof AlertThresholdOverrides, true>> = {
  productionDrop: true,
  feedCostRise: true,
  dailyMortalityRate: true,
};

function toDisplayValue(field: ThresholdField, stored: number | null | undefined): string {
  if (stored === null || stored === undefined) return "";
  return String(PERCENT_TO_FRACTION[field.key] ? stored * 100 : stored);
}

export function ThresholdForm({ overrides }: { overrides: AlertThresholdOverrides | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map((field) => [field.key, toDisplayValue(field, overrides?.[field.key])])
    )
  );

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const payload = Object.fromEntries(
        FIELDS.map((field) => {
          const raw = values[field.key] ?? "";
          if (raw === "") return [field.key, ""];
          const numeric = Number(raw);
          const stored = PERCENT_TO_FRACTION[field.key] ? numeric / 100 : numeric;
          return [field.key, String(stored)];
        })
      );

      const result = await saveAlertThresholdsAction(payload);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess("Alert settings saved.");
      router.refresh();
    });
  }

  return (
    <Panel title="Thresholds">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              htmlFor={`threshold-${field.key}`}
              hint={field.hint}
              error={fieldErrors[field.key]}
            >
              <NumberInput
                id={`threshold-${field.key}`}
                step={field.step}
                min={0}
                placeholder={String(field.defaultValue)}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
            </Field>
          ))}
        </div>

        <Button type="submit" size="lg" block loading={pending}>
          <BellRing className="size-4" aria-hidden />
          {pending ? "Saving…" : "Save alert settings"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Leave a field blank to use the default shown as its placeholder.
        </p>
      </form>
    </Panel>
  );
}
