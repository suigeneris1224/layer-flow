"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import {
  describePriceChange,
  impliedPricePerEgg,
  planPriceChange,
  type CurrentPrice,
} from "@/lib/domain/pricing";
import { setPriceAction } from "@/app/(app)/prices/actions";
import { currencySymbol, formatCurrency, formatPercent } from "@/lib/format";

interface SizeOption {
  eggSizeId: string;
  name: string;
  currentPrice: CurrentPrice | null;
}

/**
 * Change the price of one egg size.
 *
 * The implied per-egg figure under the tray price is a typo guard: entering 21
 * instead of 210 shows "= PHP 0.70 each", which is obviously wrong at a glance
 * and catches the mistake before it reaches a sale.
 */
export function PriceForm({
  sizes,
  today,
  currency,
}: {
  sizes: SizeOption[];
  today: string;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [eggSizeId, setEggSizeId] = useState(sizes[0]?.eggSizeId ?? "");
  const selected = sizes.find((size) => size.eggSizeId === eggSizeId);

  const [pricePerTray, setPricePerTray] = useState(
    () => String(sizes[0]?.currentPrice?.pricePerTray ?? "")
  );
  const [pricePerEgg, setPricePerEgg] = useState(
    () => String(sizes[0]?.currentPrice?.pricePerEgg ?? "")
  );
  const [effectiveFrom, setEffectiveFrom] = useState(today);

  function onSizeChange(nextId: string) {
    const next = sizes.find((size) => size.eggSizeId === nextId);
    setEggSizeId(nextId);
    setPricePerTray(String(next?.currentPrice?.pricePerTray ?? ""));
    setPricePerEgg(String(next?.currentPrice?.pricePerEgg ?? ""));
    setFormError(null);
    setSuccess(null);
  }

  const trayNumber = Number(pricePerTray);
  const implied = impliedPricePerEgg(trayNumber);

  // Same rule the server applies, so an impossible date is refused while
  // typing rather than after a round trip.
  const datePlan = useMemo(
    () => planPriceChange(selected?.currentPrice ?? null, effectiveFrom, today),
    [selected, effectiveFrom, today]
  );

  const change = useMemo(() => {
    if (!selected?.currentPrice || !Number.isFinite(trayNumber) || trayNumber <= 0) return null;
    return describePriceChange(selected.currentPrice.pricePerTray, trayNumber);
  }, [selected, trayNumber]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await setPriceAction({
        eggSizeId,
        pricePerEgg,
        pricePerTray,
        effectiveFrom,
      });

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setSuccess(
        effectiveFrom === today
          ? "Price updated."
          : `Price scheduled to start ${effectiveFrom}.`
      );
      router.refresh();
    });
  }

  if (sizes.length === 0) return null;

  return (
    <Panel title="Change a price">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError && <StatusNote tone="bad">{formError}</StatusNote>}
          {success && <StatusNote tone="good">{success}</StatusNote>}

          <Field label="Egg size" htmlFor="price-size">
            <Select
              id="price-size"
              value={eggSizeId}
              onChange={(event) => onSizeChange(event.target.value)}
            >
              {sizes.map((size) => (
                <option key={size.eggSizeId} value={size.eggSizeId}>
                  {size.name}
                  {size.currentPrice
                    ? ` — ${formatCurrency(size.currentPrice.pricePerTray, currency)} a tray`
                    : " — no price yet"}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Price per tray"
              htmlFor="price-tray"
              hint={implied > 0 ? `= ${formatCurrency(implied, currency)} each` : undefined}
            >
              <NumberInput
                id="price-tray"
                step="0.01"
                min={0}
                value={pricePerTray}
                onChange={(event) => setPricePerTray(event.target.value)}
                placeholder="0.00"
                adornment={currencySymbol(currency)}
              />
            </Field>

            <Field label="Price per egg" htmlFor="price-egg" hint="For loose eggs.">
              <NumberInput
                id="price-egg"
                step="0.01"
                min={0}
                value={pricePerEgg}
                onChange={(event) => setPricePerEgg(event.target.value)}
                placeholder="0.00"
                adornment={currencySymbol(currency)}
              />
            </Field>
          </div>

          {change && change.direction !== "same" && selected?.currentPrice && (
            <StatusNote tone={change.direction === "up" ? "good" : "warn"}>
              {formatCurrency(selected.currentPrice.pricePerTray, currency)} →{" "}
              {formatCurrency(trayNumber, currency)} a tray
              {change.percent !== null && (
                <>
                  {" "}
                  ({change.direction === "up" ? "+" : ""}
                  {formatPercent(change.percent)})
                </>
              )}
            </StatusNote>
          )}

          <Field
            label="Starts from"
            htmlFor="price-from"
            hint="Today, or a future date to schedule the change."
            error={!datePlan.ok ? datePlan.message : undefined}
          >
            <Input
              id="price-from"
              type="date"
              min={today}
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              aria-invalid={!datePlan.ok}
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            block
            loading={pending}
            disabled={!datePlan.ok || !pricePerTray}
          >
            <Tags className="size-4" aria-hidden />
            {pending ? "Saving…" : "Save price"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Sales you have already recorded keep the price you used that day — changing a price
            never rewrites past sales.
          </p>
        </form>
    </Panel>
  );
}
