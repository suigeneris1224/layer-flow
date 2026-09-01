"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { StatusNote } from "@/components/ui/states";
import { feedCost } from "@/lib/domain/calculations";
import { formatCurrency } from "@/lib/format";
import type { FeedEntry } from "@/lib/data/health";
import type { FlockChoice } from "./flock-choice";
import {
  deleteFeedUsageAction,
  recordFeedUsageAction,
  updateFeedUsageAction,
} from "./actions";
import { feedUsageSchema, toFieldErrors } from "@/lib/validation/schemas";
import { useConnectivity } from "@/lib/offline/use-connectivity";
import { enqueueWrite, generateWriteId } from "@/lib/offline/queue";

const NEW = "__new__";

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Feed given outside a collection day -- a delivery, or a between-days top-up. */
export function FeedForm({
  records,
  flocks,
  today,
  lastCostPerKg,
  currency,
  offlineEnabled,
}: {
  records: FeedEntry[];
  flocks: FlockChoice[];
  today: string;
  lastCostPerKg: number;
  currency: string;
  /** Whether the farm's plan includes offline recording (lib/offline/). */
  offlineEnabled: boolean;
}) {
  const router = useRouter();
  const online = useConnectivity();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(NEW);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = records.find((record) => record.id === selected) ?? null;

  const defaultCost = lastCostPerKg > 0 ? String(lastCostPerKg) : "";

  const [flockId, setFlockId] = useState(flocks[0]?.id ?? "");
  const [usageDate, setUsageDate] = useState(today);
  const [quantityKg, setQuantityKg] = useState("");
  const [costPerKg, setCostPerKg] = useState(defaultCost);
  const [feedType, setFeedType] = useState("");
  const [notes, setNotes] = useState("");

  const total = feedCost(toNumber(quantityKg), toNumber(costPerKg));

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = records.find((record) => record.id === nextId) ?? null;
    setFlockId(next?.flockId ?? flocks[0]?.id ?? "");
    setUsageDate(next?.usageDate ?? today);
    setQuantityKg(next ? String(next.quantityKg) : "");
    setCostPerKg(next ? String(next.costPerKg) : defaultCost);
    setFeedType(next?.feedType ?? "");
    setNotes(next?.notes ?? "");
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    const values = { flockId, usageDate, quantityKg, costPerKg, feedType, notes };

    // See the matching comment in mortality-form.tsx: only a brand-new
    // record queues offline; editing/deleting still needs the server.
    if (!editing && !online && offlineEnabled) {
      const parsed = feedUsageSchema.safeParse(values);
      if (!parsed.success) {
        setFieldErrors(toFieldErrors(parsed.error));
        setFormError("Please check the form below.");
        return;
      }

      startTransition(async () => {
        const clientId = generateWriteId();
        await enqueueWrite({
          id: clientId,
          kind: "feed_usage",
          payload: { ...parsed.data, clientId },
        });
        setSuccess("Saved. It will sync when you have signal.");
        setQuantityKg("");
        setFeedType("");
        setNotes("");
      });
      return;
    }

    startTransition(async () => {
      const result = editing
        ? await updateFeedUsageAction(editing.id, values)
        : await recordFeedUsageAction(values);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Record updated." : "Feed recorded.");
      if (!editing) {
        setQuantityKg("");
        setFeedType("");
        setNotes("");
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (!window.confirm("Delete this feed record? This cannot be undone.")) return;

    setFormError(null);
    startTransition(async () => {
      const result = await deleteFeedUsageAction(editing.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  return (
    <Panel title={editing ? "Edit this record" : "Record feed"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {records.length > 0 && (
          <Field label="Record" htmlFor="feed-select">
            <Select
              id="feed-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value={NEW}>+ Record new feed</option>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.usageDate} · {record.flockName} · {record.quantityKg} kg
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Flock" htmlFor="feed-flock" error={fieldErrors.flockId}>
          <Select
            id="feed-flock"
            value={flockId}
            onChange={(event) => setFlockId(event.target.value)}
          >
            {flocks.map((flock) => (
              <option key={flock.id} value={flock.id}>
                {flock.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date" htmlFor="feed-date" error={fieldErrors.usageDate}>
          <DateField
            id="feed-date"
            max={today}
            today={today}
            value={usageDate}
            onChange={setUsageDate}
            invalid={!!fieldErrors.usageDate}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Feed used (kg)"
            htmlFor="feed-quantity"
            error={fieldErrors.quantityKg}
          >
            <NumberInput
              id="feed-quantity"
              min={0}
              step="0.001"
              value={quantityKg}
              onChange={(event) => setQuantityKg(event.target.value)}
              aria-invalid={!!fieldErrors.quantityKg}
            />
          </Field>

          <Field
            label="Cost per kg"
            htmlFor="feed-cost"
            hint="Optional."
            error={fieldErrors.costPerKg}
          >
            <NumberInput
              id="feed-cost"
              min={0}
              step="0.01"
              value={costPerKg}
              onChange={(event) => setCostPerKg(event.target.value)}
            />
          </Field>
        </div>

        {total > 0 && (
          <p className="text-sm text-muted-foreground">
            Total cost:{" "}
            <span className="font-semibold tabular text-foreground">
              {formatCurrency(total, currency)}
            </span>
          </p>
        )}

        <Field
          label="Feed type"
          htmlFor="feed-type"
          hint="Optional. Layer mash, pellets, whatever you call it."
          error={fieldErrors.feedType}
        >
          <Input
            id="feed-type"
            value={feedType}
            onChange={(event) => setFeedType(event.target.value)}
          />
        </Field>

        <Field label="Notes" htmlFor="feed-notes" hint="Optional." error={fieldErrors.notes}>
          <Textarea
            id="feed-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!flockId || !quantityKg}>
            <Wheat className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Record feed"}
          </Button>

          {editing && (
            <Button type="button" variant="outline" loading={pending} onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
