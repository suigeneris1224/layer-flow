"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Egg, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, Label, NumberInput, Select, Textarea } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { dailyProductionSchema, toFieldErrors } from "@/lib/validation/schemas";
import { loadProductionAction, recordProductionAction } from "@/app/(app)/production/actions";
import {
  eggsToTrays,
  feedCost,
  feedPerHen,
  layingRate,
  sellableEggs,
  validateEggSizeBreakdown,
} from "@/lib/domain/calculations";
import { currencySymbol, formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FlockOption {
  id: string;
  name: string;
  breed: string;
  current_hens: number;
}

interface SizeOption {
  id: string;
  name: string;
  code: string;
}

interface FormValues {
  flockId: string;
  productionDate: string;
  hensPresent: string;
  eggsCollected: string;
  brokenEggs: string;
  dirtyEggs: string;
  mortality: string;
  feedKg: string;
  feedCostPerKg: string;
  notes: string;
  sizes: { eggSizeId: string; quantity: string }[];
}

/** Inputs arrive as strings; treat anything unparseable as zero. */
function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ProductionForm({
  flocks,
  eggSizes,
  recordedDates,
  today,
  lastFeedCostPerKg,
  currency,
}: {
  flocks: FlockOption[];
  eggSizes: SizeOption[];
  recordedDates: Record<string, string[]>;
  today: string;
  lastFeedCostPerKg: number;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const [loadingExisting, setLoadingExisting] = useState(false);

  const { register, handleSubmit, watch, setError, reset, formState } = useForm<FormValues>({
    defaultValues: {
      flockId: flocks[0]?.id ?? "",
      productionDate: today,
      // Pre-filled from the flock roster so the common case is "looks right, next".
      hensPresent: String(flocks[0]?.current_hens ?? 0),
      eggsCollected: "",
      brokenEggs: "0",
      dirtyEggs: "0",
      mortality: "0",
      feedKg: "",
      feedCostPerKg: lastFeedCostPerKg > 0 ? String(lastFeedCostPerKg) : "",
      notes: "",
      sizes: eggSizes.map((size) => ({ eggSizeId: size.id, quantity: "" })),
    },
  });

  const values = watch();

  const selectedFlockId = values.flockId;
  const selectedDate = values.productionDate;

  const alreadyRecorded = Boolean(recordedDates[selectedFlockId]?.includes(selectedDate));

  /** Blank slate for a day that has no record yet. */
  const emptyDay = useCallback(
    (flockId: string, date: string): FormValues => ({
      flockId,
      productionDate: date,
      hensPresent: String(flocks.find((f) => f.id === flockId)?.current_hens ?? 0),
      eggsCollected: "",
      brokenEggs: "0",
      dirtyEggs: "0",
      mortality: "0",
      feedKg: "",
      feedCostPerKg: lastFeedCostPerKg > 0 ? String(lastFeedCostPerKg) : "",
      notes: "",
      sizes: eggSizes.map((size) => ({ eggSizeId: size.id, quantity: "" })),
    }),
    [eggSizes, flocks, lastFeedCostPerKg]
  );

  /*
   * Saving replaces the whole day, so an already-recorded date must open with
   * its existing numbers. Opening it blank and typing "10" would silently wipe
   * the real count rather than adjust it.
   *
   * The request is keyed so a slow response for a previously selected day
   * cannot land after the farmer has moved on and overwrite their input.
   */
  const requestKey = useRef("");

  useEffect(() => {
    const key = `${selectedFlockId}|${selectedDate}`;
    requestKey.current = key;

    if (!selectedFlockId || !selectedDate) return;

    if (!alreadyRecorded) {
      setLoadingExisting(false);
      reset(emptyDay(selectedFlockId, selectedDate));
      return;
    }

    let cancelled = false;
    setLoadingExisting(true);

    loadProductionAction(selectedFlockId, selectedDate)
      .then((result) => {
        if (cancelled || requestKey.current !== key) return;

        if (result.ok && result.data) {
          const existing = result.data;
          reset({
            flockId: selectedFlockId,
            productionDate: selectedDate,
            hensPresent: String(existing.hensPresent),
            eggsCollected: String(existing.eggsCollected),
            brokenEggs: String(existing.brokenEggs),
            dirtyEggs: String(existing.dirtyEggs),
            mortality: String(existing.mortality),
            feedKg: existing.feedKg > 0 ? String(existing.feedKg) : "",
            feedCostPerKg:
              existing.feedCostPerKg > 0
                ? String(existing.feedCostPerKg)
                : lastFeedCostPerKg > 0
                  ? String(lastFeedCostPerKg)
                  : "",
            notes: existing.notes,
            sizes: eggSizes.map((size) => ({
              eggSizeId: size.id,
              quantity: existing.sizes[size.id] ? String(existing.sizes[size.id]) : "",
            })),
          });
        }
      })
      .finally(() => {
        if (!cancelled && requestKey.current === key) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
    // `reset` and `emptyDay` are stable; re-running on every render would
    // fight the farmer for control of the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlockId, selectedDate, alreadyRecorded]);

  const derived = useMemo(() => {
    const eggs = toNumber(values.eggsCollected);
    const hens = toNumber(values.hensPresent);
    const kg = toNumber(values.feedKg);

    const breakdown = (values.sizes ?? []).map((row) => ({
      eggSizeId: row.eggSizeId,
      quantity: toNumber(row.quantity),
    }));

    const check = validateEggSizeBreakdown(eggs, breakdown);
    const { trays, looseEggs } = eggsToTrays(eggs);

    return {
      eggs,
      hens,
      layingRate: layingRate(eggs, hens),
      sellable: sellableEggs(eggs, toNumber(values.brokenEggs), toNumber(values.dirtyEggs)),
      trays,
      looseEggs,
      feedPerHen: feedPerHen(kg, hens),
      feedCost: feedCost(kg, toNumber(values.feedCostPerKg)),
      breakdown,
      check,
    };
  }, [values]);

  const onSubmit = handleSubmit((raw) => {
    setFormError(null);

    // Same schema the server uses. Validating here saves a round trip; the
    // server still re-validates, because a browser check is not a control.
    const candidate = {
      ...raw,
      sizes: (raw.sizes ?? []).map((row) => ({
        eggSizeId: row.eggSizeId,
        quantity: toNumber(row.quantity),
      })),
    };

    const parsed = dailyProductionSchema.safeParse(candidate);

    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof FormValues, { message });
      }
      setFormError(fieldErrors.sizes ?? "Please check the numbers below.");
      return;
    }

    startTransition(async () => {
      const result = await recordProductionAction(parsed.data);

      if (!result.ok) {
        setFormError(result.error);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(field as keyof FormValues, { message });
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  });

  const errors = formState.errors;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {formError && <StatusNote tone="bad">{formError}</StatusNote>}

      {alreadyRecorded && (
        <StatusNote tone="warn" title="Editing an existing record">
          {loadingExisting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading what you recorded…
            </span>
          ) : (
            <>
              These are the numbers already saved for this day. Change them to the new{" "}
              <strong>totals</strong> — what you type replaces the day, it is not added on top.
            </>
          )}
        </StatusNote>
      )}

      {/* Two columns from lg: entry on the left, the optional extras beside it.
          Stacks on mobile, where the order is the order you fill it in. */}
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel title="Today's collection" bodyClassName="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Flock" htmlFor="flockId" error={errors.flockId?.message}>
                <Select id="flockId" {...register("flockId")}>
                  {flocks.map((flock) => (
                    <option key={flock.id} value={flock.id}>
                      {flock.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Date" htmlFor="productionDate" error={errors.productionDate?.message}>
                <Input id="productionDate" type="date" max={today} {...register("productionDate")} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hens present" htmlFor="hensPresent" error={errors.hensPresent?.message}>
                <NumberInput id="hensPresent" min={0} {...register("hensPresent")} />
              </Field>

              <Field
                label="Eggs collected"
                htmlFor="eggsCollected"
                error={errors.eggsCollected?.message}
              >
                <NumberInput
                  id="eggsCollected"
                  min={0}
                  autoFocus
                  placeholder="0"
                  {...register("eggsCollected")}
                />
              </Field>
            </div>

            {/* Live readout. This is what makes a typo obvious before saving. */}
            <dl
              aria-live="polite"
              className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-center"
            >
              <Derived label="Laying rate" value={formatPercent(derived.layingRate)} />
              <Derived label="Sellable" value={formatNumber(derived.sellable)} />
              <Derived
                label="Trays"
                value={
                  derived.looseEggs > 0
                    ? `${formatNumber(derived.trays)} + ${formatNumber(derived.looseEggs)}`
                    : formatNumber(derived.trays)
                }
              />
            </dl>
          </Panel>

          <Panel
            title="Egg sizes"
            bodyClassName="flex flex-col gap-4"
            action={
              <span
                className={cn(
                  "text-xs tabular",
                  derived.check.ok ? "text-muted-foreground" : "text-destructive"
                )}
              >
                {formatNumber(derived.check.total)} of {formatNumber(derived.eggs)}
              </span>
            }
          >
            {eggSizes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No egg sizes are set up yet. You can still save the total.
              </p>
            )}

            {eggSizes.map((size, index) => {
              const quantity = derived.breakdown[index]?.quantity ?? 0;
              const share =
                derived.check.total > 0 ? (quantity / derived.check.total) * 100 : 0;

              return (
                <div key={size.id} className="flex items-center gap-3">
                  <Label htmlFor={`size-${size.id}`} className="w-24 shrink-0 truncate">
                    {size.name}
                  </Label>
                  <input type="hidden" {...register(`sizes.${index}.eggSizeId`)} />
                  <NumberInput
                    id={`size-${size.id}`}
                    min={0}
                    placeholder="0"
                    className="flex-1"
                    {...register(`sizes.${index}.quantity`)}
                  />
                  <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular">
                    {share > 0 ? formatPercent(share, 0) : "—"}
                  </span>
                </div>
              );
            })}

            {!derived.check.ok && (
              <StatusNote tone="bad">{derived.check.message}</StatusNote>
            )}

            {derived.check.ok && derived.check.unassigned > 0 && derived.eggs > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatNumber(derived.check.unassigned)} eggs not yet sorted by size. That&apos;s
                fine — you can finish later.
              </p>
            )}
          </Panel>
        </div>

        <div>
          <Panel title="Losses, feed and notes" bodyClassName="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Broken" htmlFor="brokenEggs" error={errors.brokenEggs?.message}>
                <NumberInput id="brokenEggs" min={0} {...register("brokenEggs")} />
              </Field>
              <Field label="Dirty" htmlFor="dirtyEggs" error={errors.dirtyEggs?.message}>
                <NumberInput id="dirtyEggs" min={0} {...register("dirtyEggs")} />
              </Field>
              <Field label="Deaths" htmlFor="mortality" error={errors.mortality?.message}>
                <NumberInput id="mortality" min={0} {...register("mortality")} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Feed used (kg)"
                htmlFor="feedKg"
                hint={
                  derived.feedPerHen > 0
                    ? `${formatNumber(derived.feedPerHen, 3)} kg per hen`
                    : undefined
                }
                error={errors.feedKg?.message}
              >
                <NumberInput id="feedKg" min={0} step="0.1" placeholder="0" {...register("feedKg")} />
              </Field>

              <Field
                label="Feed cost per kg"
                htmlFor="feedCostPerKg"
                hint={
                  derived.feedCost > 0 ? `${formatCurrency(derived.feedCost, currency)} today` : undefined
                }
                error={errors.feedCostPerKg?.message}
              >
                <NumberInput
                  id="feedCostPerKg"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  adornment={currencySymbol(currency)}
                  {...register("feedCostPerKg")}
                />
              </Field>
            </div>

            <Field label="Notes" htmlFor="notes" hint="Optional." error={errors.notes?.message}>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </Field>
          </Panel>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        block
        loading={pending}
        // Saving mid-load would write the blank form over a real day.
        disabled={!derived.check.ok || loadingExisting}
        className="sticky bottom-20 lg:bottom-4"
      >
        <Egg className="size-4" aria-hidden />
        {pending ? "Saving…" : alreadyRecorded ? "Update today's record" : "Save today's record"}
      </Button>
    </form>
  );
}

function Derived({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 tabular text-lg font-semibold">{value}</dd>
    </div>
  );
}
