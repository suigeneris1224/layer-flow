"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { ADJUSTMENT_REASONS, validateAdjustment } from "@/lib/domain/inventory";
import { recordAdjustmentAction } from "@/app/(app)/inventory/actions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SizeOption {
  eggSizeId: string;
  name: string;
  eggsAvailable: number;
}

/**
 * Record a stock correction.
 *
 * Direction is a pair of buttons rather than a signed number: asking a farmer
 * to type "-20" to record breakage invites a sign error every single time.
 */
export function AdjustForm({ sizes, today }: { sizes: SizeOption[]; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [eggSizeId, setEggSizeId] = useState(sizes[0]?.eggSizeId ?? "");
  const [direction, setDirection] = useState<"ADD" | "REMOVE">("REMOVE");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("SPOILAGE");
  const [note, setNote] = useState("");

  const selected = sizes.find((size) => size.eggSizeId === eggSizeId);
  const available = selected?.eggsAvailable ?? 0;

  // Same rule the server enforces, run locally so the farmer sees the problem
  // while typing instead of after a round trip.
  const preview = useMemo(() => {
    const parsed = Number(quantity);
    if (!quantity || !Number.isFinite(parsed) || parsed <= 0) return null;

    const signed = direction === "REMOVE" ? -parsed : parsed;
    const check = validateAdjustment(available, signed, selected?.name ?? "these");

    return { signed, check, after: available + signed };
  }, [quantity, direction, available, selected?.name]);

  const blocked = Boolean(preview && !preview.check.ok);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await recordAdjustmentAction({
        eggSizeId,
        direction,
        quantity,
        reason,
        note,
        adjustmentDate: today,
      });

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setQuantity("");
      setNote("");
      setSuccess("Stock updated.");
      router.refresh();
    });
  }

  if (sizes.length === 0) return null;

  return (
    <Panel title="Adjust stock">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError && <StatusNote tone="bad">{formError}</StatusNote>}
          {success && <StatusNote tone="good">{success}</StatusNote>}

          <Field label="Egg size" htmlFor="adjust-size">
            <Select
              id="adjust-size"
              value={eggSizeId}
              onChange={(event) => setEggSizeId(event.target.value)}
            >
              {sizes.map((size) => (
                <option key={size.eggSizeId} value={size.eggSizeId}>
                  {size.name} — {formatNumber(size.eggsAvailable)} available
                </option>
              ))}
            </Select>
          </Field>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Add or remove?</legend>
            <div className="grid grid-cols-2 gap-2">
              <DirectionButton
                active={direction === "REMOVE"}
                onClick={() => setDirection("REMOVE")}
                icon={<Minus className="size-4" aria-hidden />}
                label="Remove"
              />
              <DirectionButton
                active={direction === "ADD"}
                onClick={() => setDirection("ADD")}
                icon={<Plus className="size-4" aria-hidden />}
                label="Add"
              />
            </div>
          </fieldset>

          <Field
            label="How many eggs?"
            htmlFor="adjust-quantity"
            error={blocked ? (preview!.check as { message: string }).message : undefined}
            hint={
              preview && preview.check.ok
                ? `${selected?.name} will go from ${formatNumber(available)} to ${formatNumber(preview.after)}`
                : undefined
            }
          >
            <NumberInput
              id="adjust-quantity"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
              aria-invalid={blocked}
            />
          </Field>

          <Field label="Reason" htmlFor="adjust-reason">
            <Select
              id="adjust-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                const picked = ADJUSTMENT_REASONS.find((r) => r.value === event.target.value);
                if (picked) setDirection(picked.removes ? "REMOVE" : "ADD");
              }}
            >
              {ADJUSTMENT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Note" htmlFor="adjust-note" hint="Optional.">
            <Input
              id="adjust-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={200}
            />
          </Field>

          <Button type="submit" size="lg" block loading={pending} disabled={blocked || !quantity}>
            {pending ? "Saving…" : "Record adjustment"}
          </Button>
        </form>
    </Panel>
  );
}

function DirectionButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
