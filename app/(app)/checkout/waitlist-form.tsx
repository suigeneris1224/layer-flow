"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Sprout } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import { WAITLIST_FLOCK_SIZES } from "@/lib/domain/waitlist";
import { formatDate } from "@/lib/format";
import type { SubscriptionPlan, WaitlistFlockSize } from "@/lib/types/database";
import { joinWaitlistAction } from "./actions";

/**
 * Checkout while BILLING_MODE=validation: no payment, just the waitlist --
 * plus a free trial when the account is eligible (lib/subscriptions/trial.ts).
 * The copy says plainly why: paid plans aren't open yet.
 */
export function WaitlistForm({
  plan,
  planName,
  farmNameDefault,
  mobileDefault,
  flockSizeDefault,
  trialAvailable,
  trialDays,
  alreadyJoined,
}: {
  plan: SubscriptionPlan;
  planName: string;
  farmNameDefault: string;
  mobileDefault: string;
  flockSizeDefault: WaitlistFlockSize | "";
  trialAvailable: boolean;
  trialDays: number;
  alreadyJoined: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [farmName, setFarmName] = useState(farmNameDefault);
  const [mobileNumber, setMobileNumber] = useState(mobileDefault);
  const [flockSize, setFlockSize] = useState<WaitlistFlockSize | "">(flockSizeDefault);
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [joined, setJoined] = useState<{ trialEndsAt: string | null } | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await safeAction(() =>
        joinWaitlistAction({ plan, farmName, mobileNumber, flockSize, consent })
      );

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setJoined({ trialEndsAt: result.data?.trialEndsAt ?? null });
      router.refresh();
    });
  }

  if (joined) {
    return (
      <Panel title="You're on the waitlist">
        <div className="flex flex-col gap-4 text-sm">
          <StatusNote tone="good">
            {joined.trialEndsAt
              ? `${planName} is active until ${formatDate(joined.trialEndsAt)}. After that you're back on Free and keep all your records.`
              : `We'll email you as soon as ${planName} opens.`}
          </StatusNote>
          <p className="text-muted-foreground">We&apos;ve sent a confirmation to your email.</p>
          <div>
            <Link href="/dashboard" className={buttonVariants({ variant: "primary" })}>
              Go to your dashboard
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Join the waitlist">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted-foreground">
          Paid plans open soon — no payment is needed today.{" "}
          {trialAvailable
            ? `Join the waitlist and try ${planName} free for ${trialDays} days. When the trial ends you go back to Free and keep all your records.`
            : `Join the waitlist and we'll email you when ${planName} opens.`}{" "}
          Waitlist members get a founding-farmer offer when paid plans open.
        </p>

        {alreadyJoined && (
          <StatusNote tone="info">
            You&apos;re already on the waitlist. Saving again updates your details.
          </StatusNote>
        )}
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}

        <Field label="Farm name" htmlFor="waitlist-farm" error={fieldErrors.farmName}>
          <Input
            id="waitlist-farm"
            value={farmName}
            onChange={(event) => setFarmName(event.target.value)}
            aria-invalid={!!fieldErrors.farmName}
          />
        </Field>

        <Field
          label="Mobile number"
          htmlFor="waitlist-mobile"
          error={fieldErrors.mobileNumber}
          hint="So we can reach you when paid plans open."
        >
          <Input
            id="waitlist-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0917 123 4567"
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            aria-invalid={!!fieldErrors.mobileNumber}
          />
        </Field>

        <Field label="Estimated flock size" htmlFor="waitlist-flock" error={fieldErrors.flockSize}>
          <Select
            id="waitlist-flock"
            value={flockSize}
            onChange={(event) => setFlockSize(event.target.value as WaitlistFlockSize | "")}
            aria-invalid={!!fieldErrors.flockSize}
          >
            <option value="" disabled>
              Choose one
            </option>
            {WAITLIST_FLOCK_SIZES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <Checkbox
            id="waitlist-consent"
            align="start"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            aria-invalid={!!fieldErrors.consent}
            label={
              <span>
                I agree that LayerFlow may email me and contact me at this number about paid plans.
                See our{" "}
                <Link href="/privacy" target="_blank" className="font-medium underline">
                  Privacy Policy
                </Link>
                .
              </span>
            }
          />
          {fieldErrors.consent && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {fieldErrors.consent}
            </p>
          )}
        </div>

        <div>
          <Button type="submit" loading={pending} disabled={!consent}>
            <Sprout className="size-4" aria-hidden />
            {pending
              ? "Saving…"
              : trialAvailable
                ? `Start my ${trialDays}-day free trial`
                : "Join the waitlist"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
