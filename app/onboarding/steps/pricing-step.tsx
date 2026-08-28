"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, NumberInput } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { EGGS_PER_TRAY } from "@/lib/domain/calculations";
import { saveInitialPricesAction, type OnboardingActionState } from "@/app/onboarding/actions";

interface SizeOption {
  id: string;
  name: string;
  code: string;
  suggested: { perEgg: number; perTray: number };
}

/**
 * Opening prices per egg size.
 *
 * The implied per-egg figure under each tray price is a typo guard -- entering
 * 21 instead of 210 is easy on a phone, and seeing "= PHP 0.70 each" makes the
 * mistake obvious before it reaches a sale.
 */
export function PricingStep({ sizes, today }: { sizes: SizeOption[]; today: string }) {
  const [state, formAction, pending] = useActionState<OnboardingActionState, FormData>(
    saveInitialPricesAction,
    undefined
  );

  const [trayPrices, setTrayPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(sizes.map((size) => [size.id, size.suggested.perTray]))
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set your egg prices
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These are your starting prices. You can change them any time, and past sales keep the
          price you used that day.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {state && <StatusNote tone="bad">{state.error}</StatusNote>}

        <input type="hidden" name="effectiveFrom" value={today} />

        <div className="flex flex-col gap-3">
          {sizes.map((size) => {
            const perTray = trayPrices[size.id] ?? 0;
            const impliedPerEgg = perTray > 0 ? perTray / EGGS_PER_TRAY : 0;

            return (
              <div key={size.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{size.name}</p>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`perEgg-${size.id}`} className="text-xs text-muted-foreground">
                      Per egg
                    </Label>
                    <NumberInput
                      id={`perEgg-${size.id}`}
                      name={`perEgg.${size.id}`}
                      step="0.01"
                      min={0}
                      defaultValue={size.suggested.perEgg}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`perTray-${size.id}`} className="text-xs text-muted-foreground">
                      Per tray
                    </Label>
                    <NumberInput
                      id={`perTray-${size.id}`}
                      name={`perTray.${size.id}`}
                      step="0.01"
                      min={0}
                      defaultValue={size.suggested.perTray}
                      onChange={(event) =>
                        setTrayPrices((current) => ({
                          ...current,
                          [size.id]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <p className="mt-1.5 text-right text-xs text-muted-foreground tabular">
                  {impliedPerEgg > 0
                    ? `A tray of ${EGGS_PER_TRAY} works out to ₱${impliedPerEgg.toFixed(2)} each`
                    : `A tray is ${EGGS_PER_TRAY} eggs`}
                </p>
              </div>
            );
          })}
        </div>

        <Button type="submit" size="lg" block loading={pending}>
          {pending ? "Saving prices…" : "Finish setup"}
        </Button>
      </form>
    </div>
  );
}
