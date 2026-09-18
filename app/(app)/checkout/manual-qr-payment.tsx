"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Copy, Eye, EyeOff, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { MANUAL_PAYMENT_METHODS } from "@/lib/subscriptions/manual-payment-config";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/types/database";
import { safeAction } from "@/lib/client/safe-action";
import { submitManualPaymentAction } from "./actions";

const RECEIPT_ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Hidden by default, matching how GCash itself displays a recipient on a
 * payment request or QR share -- full details are one tap away, not gone,
 * since this app's "Copy" button and manual bank/InstaPay senders still need
 * the real number to actually send money. Masking is a privacy default for
 * anyone glancing at the screen, not an access control.
 */
function maskAccountName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? name;
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase() ?? "";
  return `${parts[0]} ${lastInitial}.`;
}

function maskAccountNumber(number: string): string {
  const digits = number.replace(/\s+/g, "");
  if (digits.length <= 6) return number;
  const start = digits.slice(0, 4);
  const end = digits.slice(-2);
  return `${start} ${"*".repeat(digits.length - 6)} ${end}`;
}

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
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [payerName, setPayerName] = useState(payerNameDefault);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exactly one payment method -- no picker needed. See
  // lib/subscriptions/manual-payment-config.ts.
  const method = MANUAL_PAYMENT_METHODS[0];

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
      const result = await safeAction(() => submitManualPaymentAction(formData));
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
              <dd className="font-medium">
                {revealed ? method.accountName : maskAccountName(method.accountName)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{method.label}</dt>
              <dd className="flex items-center gap-2 font-medium">
                <span className="tabular">
                  {revealed ? method.accountNumber : maskAccountNumber(method.accountNumber)}
                </span>
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
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              className="mt-1 flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {revealed ? (
                <EyeOff className="size-3.5" aria-hidden />
              ) : (
                <Eye className="size-3.5" aria-hidden />
              )}
              {revealed ? "Hide full details" : "Show full details"}
            </button>
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
