"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Copy, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { MANUAL_PAYMENT_METHODS } from "@/lib/subscriptions/manual-payment-config";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import { submitManualPaymentAction } from "./actions";

const RECEIPT_ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

export function ManualQrPayment({
  plan,
  billingPeriod,
  payerNameDefault,
}: {
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
  payerNameDefault: string;
}) {
  const [pending, startTransition] = useTransition();
  const [methodId, setMethodId] = useState(MANUAL_PAYMENT_METHODS[0].id);
  const [copied, setCopied] = useState(false);
  const [payerName, setPayerName] = useState(payerNameDefault);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const method = MANUAL_PAYMENT_METHODS.find((m) => m.id === methodId) ?? MANUAL_PAYMENT_METHODS[0];

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(method.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the number and copy it.");
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName(null);
      return;
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setError("That file is larger than 5 MB. Please choose a smaller one.");
      event.target.value = "";
      setFileName(null);
      return;
    }
    setError(null);
    setFileName(file.name);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    formData.set("plan", plan);
    formData.set("billingPeriod", billingPeriod);

    startTransition(async () => {
      const result = await submitManualPaymentAction(formData);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Panel title="Payment submitted">
        <StatusNote tone="good" title="We're verifying your payment">
          Your reference number and receipt have been sent for review. Your plan will be
          updated once an admin approves it — this usually takes less than a day.
        </StatusNote>
      </Panel>
    );
  }

  return (
    <Panel title="Manual QR / Bank Transfer">
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Payment channel" className="flex flex-wrap gap-2">
          {MANUAL_PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === methodId}
              onClick={() => setMethodId(m.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                m.id === methodId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
          <Image
            src={method.qrImageSrc}
            alt={`${method.label} QR code`}
            width={160}
            height={160}
            unoptimized
            className="size-40 shrink-0 rounded-md border border-border bg-white object-contain"
          />
          <dl className="flex flex-1 flex-col gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Account name</dt>
              <dd className="font-medium">{method.accountName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{method.label}</dt>
              <dd className="flex items-center gap-2 font-medium">
                <span className="tabular">{method.accountNumber}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyAccountNumber}
                  aria-label={`Copy ${method.label} account number`}
                >
                  {copied ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </dd>
            </div>
          </dl>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 border-t border-border pt-4">
          {error && <StatusNote tone="bad">{error}</StatusNote>}

          <Field label="Payer / Business / Farm name" htmlFor="payerName" error={fieldErrors.payerName}>
            <Input
              id="payerName"
              name="payerName"
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
              required
              maxLength={200}
            />
          </Field>

          <Field
            label="Payment reference number"
            htmlFor="referenceNumber"
            hint="The transaction ID from your GCash/Maya/bank receipt."
            error={fieldErrors.referenceNumber}
          >
            <Input
              id="referenceNumber"
              name="referenceNumber"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              required
              maxLength={100}
            />
          </Field>

          <Field
            label="Proof of payment"
            htmlFor="receipt"
            hint="JPG, PNG, or PDF, up to 5 MB."
            error={fieldErrors.form}
          >
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="receipt"
                name="receipt"
                type="file"
                accept={RECEIPT_ACCEPT}
                onChange={onFileChange}
                className="sr-only"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="size-4" aria-hidden />
                Choose file
              </Button>
              <span className="truncate text-sm text-muted-foreground">
                {fileName ?? "No file chosen"}
              </span>
            </div>
          </Field>

          <Button type="submit" loading={pending} className="w-fit">
            Submit payment for review
          </Button>
        </form>
      </div>
    </Panel>
  );
}
