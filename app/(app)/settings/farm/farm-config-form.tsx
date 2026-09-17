"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";
import { SUPPORTED_CURRENCIES, SUPPORTED_TIMEZONES } from "@/lib/domain/farm-config";
import { updateFarmConfigAction } from "./actions";
import { safeAction } from "@/lib/client/safe-action";

export function FarmConfigForm({
  currentCurrency,
  currentTimezone,
}: {
  currentCurrency: string;
  currentTimezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useState(currentCurrency);
  const [timezone, setTimezone] = useState(currentTimezone);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    startTransition(async () => {
      const result = await safeAction(() => updateFarmConfigAction({ currency, timezone }));

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(true);
      // The topbar, dashboard and every money figure on the page read
      // currency/timezone from the farm context -- a plain refresh is enough
      // to pick up the new values everywhere without a full reload.
      router.refresh();
    });
  }

  return (
    <Panel title="Farm configuration">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">Farm configuration saved.</StatusNote>}

        <Field label="Currency" htmlFor="farm-currency" error={fieldErrors.currency}>
          <Select
            id="farm-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            aria-invalid={!!fieldErrors.currency}
          >
            {SUPPORTED_CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Timezone"
          htmlFor="farm-timezone"
          hint="Used for 'today' on the dashboard and reports."
          error={fieldErrors.timezone}
        >
          <Select
            id="farm-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            aria-invalid={!!fieldErrors.timezone}
          >
            {SUPPORTED_TIMEZONES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <Button type="submit" loading={pending}>
            <Settings2 className="size-4" aria-hidden />
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
