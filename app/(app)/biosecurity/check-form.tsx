"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, Select } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { StatusNote } from "@/components/ui/states";
import { safeAction } from "@/lib/client/safe-action";
import { CHECK_LABELS, CHECK_TYPES, type CheckType } from "@/lib/domain/biosecurity";
import { recordCheckAction } from "./actions";

/**
 * Routine checks: one tap per type for the common case (done today, whole
 * farm), with the date, house and a note available for anything else.
 */
export function CheckForm({
  today,
  houses,
}: {
  today: string;
  houses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<CheckType | null>(null);

  const [checkDate, setCheckDate] = useState(today);
  const [houseId, setHouseId] = useState("");
  const [notes, setNotes] = useState("");

  function record(checkType: CheckType) {
    setFormError(null);
    setSuccess(null);
    setSavingType(checkType);

    startTransition(async () => {
      const result = await safeAction(() =>
        recordCheckAction({ checkDate, checkType, houseId, notes })
      );
      setSavingType(null);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setSuccess(`${CHECK_LABELS[checkType]} logged.`);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <Panel title="Log a check">
      <div className="flex flex-col gap-4">
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <div className="grid gap-2 sm:grid-cols-2">
          {CHECK_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              loading={pending && savingType === type}
              disabled={pending}
              onClick={() => record(type)}
              className="justify-start"
            >
              <Check className="size-4" aria-hidden />
              {CHECK_LABELS[type]}
            </Button>
          ))}
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Different date, a specific house, or a note
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <Field label="Date" htmlFor="check-date">
              <DateField
                id="check-date"
                max={today}
                today={today}
                value={checkDate}
                onChange={setCheckDate}
              />
            </Field>
            {houses.length > 0 && (
              <Field label="House" htmlFor="check-house">
                <Select
                  id="check-house"
                  value={houseId}
                  onChange={(event) => setHouseId(event.target.value)}
                >
                  <option value="">Whole farm</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Note" htmlFor="check-notes" hint="Optional. Product used, bait station count…">
              <Input
                id="check-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </div>
        </details>
      </div>
    </Panel>
  );
}
