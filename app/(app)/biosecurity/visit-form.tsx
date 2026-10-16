"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Textarea } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import { recordVisitAction } from "./actions";

/**
 * Log someone coming onto the farm. Quick to fill at the gate: only the name
 * is required; everything else is optional.
 */
export function VisitForm({ today }: { today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const [visitDate, setVisitDate] = useState(today);
  const [visitorName, setVisitorName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [lastPoultryContactDate, setLastPoultryContactDate] = useState("");
  const [disinfected, setDisinfected] = useState(false);
  const [notes, setNotes] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const result = await safeAction(() =>
        recordVisitAction({
          visitDate,
          visitorName,
          purpose,
          vehiclePlate,
          lastPoultryContactDate,
          disinfected,
          notes,
        })
      );

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess("Visit logged.");
      setVisitorName("");
      setPurpose("");
      setVehiclePlate("");
      setLastPoultryContactDate("");
      setDisinfected(false);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <Panel title="Log a visitor">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <Field label="Date" htmlFor="visit-date" error={fieldErrors.visitDate}>
          <DateField
            id="visit-date"
            max={today}
            today={today}
            value={visitDate}
            onChange={setVisitDate}
            invalid={!!fieldErrors.visitDate}
          />
        </Field>

        <Field label="Visitor" htmlFor="visit-name" error={fieldErrors.visitorName}>
          <Input
            id="visit-name"
            value={visitorName}
            onChange={(event) => setVisitorName(event.target.value)}
            aria-invalid={!!fieldErrors.visitorName}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Purpose"
            htmlFor="visit-purpose"
            hint="Optional. Feed delivery, egg buyer, vet…"
            error={fieldErrors.purpose}
          >
            <Input
              id="visit-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            />
          </Field>
          <Field
            label="Vehicle plate"
            htmlFor="visit-plate"
            hint="Optional."
            error={fieldErrors.vehiclePlate}
          >
            <Input
              id="visit-plate"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value.toUpperCase())}
            />
          </Field>
        </div>

        <Field
          label="Last time near other poultry"
          htmlFor="visit-contact"
          hint="Optional. Ask if they visited another farm or poultry market recently."
          error={fieldErrors.lastPoultryContactDate}
        >
          <DateField
            id="visit-contact"
            max={visitDate}
            today={today}
            value={lastPoultryContactDate}
            onChange={setLastPoultryContactDate}
            invalid={!!fieldErrors.lastPoultryContactDate}
          />
        </Field>

        <Checkbox
          id="visit-disinfected"
          label="Footbath / disinfection done at the gate"
          checked={disinfected}
          onChange={(event) => setDisinfected(event.target.checked)}
        />

        <Field label="Notes" htmlFor="visit-notes" hint="Optional." error={fieldErrors.notes}>
          <Textarea
            id="visit-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <Button type="submit" loading={pending} disabled={!visitorName}>
          <UserCheck className="size-4" aria-hidden />
          {pending ? "Saving…" : "Log visit"}
        </Button>
      </form>
    </Panel>
  );
}
