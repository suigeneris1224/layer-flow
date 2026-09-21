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
import { looksLikeHeic, normalizeImageFile } from "@/lib/client/heic";
import { safeAction } from "@/lib/client/safe-action";
import { submitManualPaymentAction } from "./actions";

const RECEIPT_ACCEPT =
  ".jpg,.jpeg,.png,.pdf,.heic,.heif,image/jpeg,image/png,application/pdf,image/heic,image/heif";
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
  paymentNote,
}: {
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amountCentavos: number;
  payerNameDefault: string;
  /** Stable per-account code from generatePaymentNote -- see lib/domain/manual-payment-note.ts. */
  paymentNote: string;
}) {
  const [pending, startTransition] = useTransition();
  const [copiedField, setCopiedField] = useState<"account" | "note" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [payerName, setPayerName] = useState(payerNameDefault);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exactly one payment method -- no picker needed. See
  // lib/subscriptions/manual-payment-config.ts.
  const method = MANUAL_PAYMENT_METHODS[0];

  async function copyToClipboard(value: string, field: "account" | "note") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setError("Couldn't copy automatically — select the text and copy it.");
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) {
      setFileName(null);
      setReceiptFile(null);
      return;
    }

    // PDFs pass through untouched; a HEIC photo (an iPhone's default camera
    // format) is converted to JPEG here, since neither the admin review
    // panel's thumbnail nor most non-Apple browsers can render HEIC.
    let file = picked;
    if (looksLikeHeic(picked)) {
      try {
        file = await normalizeImageFile(picked);
      } catch {
        setError("That photo's format isn't supported. Please try a JPG, PNG, or PDF.");
        event.target.value = "";
        setFileName(null);
        setReceiptFile(null);
        return;
      }
    }

    if (file.size > RECEIPT_MAX_BYTES) {
      setError("That file is larger than 5 MB. Please choose a smaller one.");
      event.target.value = "";
      setFileName(null);
      setReceiptFile(null);
      return;
    }
    setError(null);
    setFileName(file.name);
    setReceiptFile(file);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!receiptFile) {
      setError("Attach your proof of payment.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("plan", plan);
    formData.set("billingPeriod", billingPeriod);
    // Overrides the native input's raw file with the (possibly HEIC-converted) one above.
    formData.set("receipt", receiptFile);

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
            width={192}
            height={192}
            unoptimized
            className="size-48 shrink-0 rounded-md border border-border bg-white object-contain"
          />
          <dl className="flex w-full flex-col gap-2 text-sm sm:flex-1">
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
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(method.accountNumber, "account")}
                  aria-label={`Copy ${method.label} account number`}
                  title={`Copy ${method.label} account number`}
                >
                  {copiedField === "account" ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Note to include</dt>
              <dd className="flex items-center gap-2 font-medium">
                <span className="tabular">{paymentNote}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(paymentNote, "note")}
                  aria-label="Copy note to include"
                  title="Copy note to include"
                >
                  {copiedField === "note" ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                </Button>
              </dd>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Paste this in GCash/Maya&apos;s own message field when you send.
              </p>
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
              // Internal spaces are never part of a real reference number --
              // stripped as typed so a spaced-out paste ("1234 5678 9012")
              // doesn't silently eat into the character limit. Mirrors the
              // same strip the server applies (manualPaymentSubmitSchema).
              onChange={(event) => setReferenceNumber(event.target.value.replace(/\s+/g, ""))}
              required
              maxLength={100}
            />
            {referenceNumber.length > 0 && /[^0-9]/.test(referenceNumber) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Most GCash/Maya references are numbers only — double-check before submitting.
              </p>
            )}
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
