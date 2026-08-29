"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, NumberInput } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { currencySymbol } from "@/lib/format";
import { recordSalePaymentAction } from "../../actions";

/**
 * Record a payment against a sale.
 *
 * The amount defaults to the full outstanding balance, so settling a sale is
 * just pressing submit; a farmer collecting a partial payment overwrites it.
 */
export function PaymentForm({
  saleId,
  outstanding,
  currency,
}: {
  saleId: string;
  outstanding: number;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(outstanding));
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(undefined);

    startTransition(async () => {
      const result = await recordSalePaymentAction(saleId, { amount });
      if (!result.ok) {
        setError(result.error);
        setFieldError(result.fieldErrors?.amount);
        return;
      }
      router.push("/sales");
      router.refresh();
    });
  }

  return (
    <Panel title="Payment">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <StatusNote tone="bad">{error}</StatusNote>}

        <Field
          label="Amount received"
          htmlFor="payment-amount"
          hint="Defaults to the full outstanding balance."
          error={fieldError}
        >
          <NumberInput
            id="payment-amount"
            adornment={currencySymbol(currency)}
            step="0.01"
            min={0.01}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!!fieldError}
          />
        </Field>

        <Button type="submit" loading={pending} disabled={!amount}>
          <Wallet className="size-4" aria-hidden />
          {pending ? "Saving…" : "Record payment"}
        </Button>
      </form>
    </Panel>
  );
}
