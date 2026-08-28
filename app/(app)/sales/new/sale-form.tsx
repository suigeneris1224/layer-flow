"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import {
  checkSaleAgainstStock,
  derivePaymentStatus,
  outstandingBalance,
  summariseSale,
  type SaleLine,
} from "@/lib/domain/sales";
import { saleItemSubtotal } from "@/lib/domain/calculations";
import { createCustomerAction, recordSaleAction } from "@/app/(app)/sales/actions";
import { recordSaleSchema, toFieldErrors } from "@/lib/validation/schemas";
import { currencySymbol, formatCurrency, formatNumber } from "@/lib/format";
import { PaymentBadge } from "@/app/(app)/sales/payment-badge";

interface SizeOption {
  eggSizeId: string;
  name: string;
  pricePerTray: number;
  pricePerEgg: number;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface StockRow {
  eggSizeId: string;
  eggsAvailable: number;
}

/** A line as the farmer is typing it. Strings until it is parsed. */
interface LineState {
  key: number;
  eggSizeId: string;
  trays: string;
  eggs: string;
  pricePerTray: string;
  pricePerEgg: string;
}

/** Inputs arrive as strings; treat anything unparseable as zero. */
function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

let nextKey = 1;

function blankLine(size: SizeOption | undefined): LineState {
  return {
    key: nextKey++,
    eggSizeId: size?.eggSizeId ?? "",
    trays: "",
    eggs: "",
    // Prefilled from the price in force today, and editable: a negotiated
    // price is real, and whatever is used here is copied onto the line.
    pricePerTray: size ? String(size.pricePerTray) : "",
    pricePerEgg: size ? String(size.pricePerEgg) : "",
  };
}

/**
 * Record an egg sale.
 *
 * Everything the farmer needs to see before committing is on screen while they
 * type: the running total, what is still owed, and whether the farm actually
 * has the eggs. The stock check warns and never blocks -- farms sell before
 * recording the morning collection, so refusing would make the app wrong about
 * reality rather than the records.
 */
export function SaleForm({
  sizes,
  customers: initialCustomers,
  flocks,
  stock,
  today,
  currency,
}: {
  sizes: SizeOption[];
  customers: CustomerOption[];
  flocks: { id: string; name: string }[];
  stock: StockRow[];
  today: string;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [saleDate, setSaleDate] = useState(today);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState("");
  const [flockId, setFlockId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineState[]>(() => [blankLine(sizes[0])]);

  const sizeNames = useMemo(
    () => new Map(sizes.map((size) => [size.eggSizeId, size.name])),
    [sizes]
  );

  const derived = useMemo(() => {
    const parsed: SaleLine[] = lines.map((line) => ({
      eggSizeId: line.eggSizeId,
      quantityTrays: toNumber(line.trays),
      quantityEggs: toNumber(line.eggs),
      pricePerTray: toNumber(line.pricePerTray),
      pricePerEgg: toNumber(line.pricePerEgg),
    }));

    const filled = parsed.filter(
      (line) => line.eggSizeId && (line.quantityTrays > 0 || line.quantityEggs > 0)
    );

    const summary = summariseSale(filled);
    const paid = toNumber(amountPaid);

    return {
      parsed,
      filled,
      summary,
      // The same rule the server and the database apply, so the status the
      // farmer sees before saving is the status that gets stored.
      status: derivePaymentStatus(summary.total, paid),
      outstanding: outstandingBalance(summary.total, paid),
      warnings: checkSaleAgainstStock(filled, stock, sizeNames),
    };
  }, [lines, amountPaid, stock, sizeNames]);

  function updateLine(key: number, patch: Partial<LineState>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  /** Changing the size re-prices the line, unless the farmer typed a price. */
  function onSizeChange(key: number, eggSizeId: string) {
    const size = sizes.find((option) => option.eggSizeId === eggSizeId);
    updateLine(key, {
      eggSizeId,
      pricePerTray: size ? String(size.pricePerTray) : "",
      pricePerEgg: size ? String(size.pricePerEgg) : "",
    });
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const candidate = {
      saleDate,
      customerId,
      flockId,
      amountPaid: amountPaid === "" ? 0 : amountPaid,
      notes,
      lines: derived.parsed.filter((line) => line.eggSizeId),
    };

    // Same schema the server uses. Validating here saves a round trip; the
    // server still re-validates, because a browser check is not a control.
    const parsed = recordSaleSchema.safeParse(candidate);

    if (!parsed.success) {
      const errors = toFieldErrors(parsed.error);
      setFieldErrors(errors);
      setFormError(errors.lines ?? "Please check the sale below.");
      return;
    }

    startTransition(async () => {
      const result = await recordSaleAction(parsed.data);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      router.push("/sales");
      router.refresh();
    });
  }

  const symbol = currencySymbol(currency);
  const canAddLine = sizes.length > 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {formError && <StatusNote tone="bad">{formError}</StatusNote>}

      {sizes.length === 0 && (
        <StatusNote tone="warn" title="No egg sizes yet">
          Egg sizes are created when you set up your farm. Set them up before recording a sale.
        </StatusNote>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel title="Sale details" bodyClassName="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="saleDate" error={fieldErrors.saleDate}>
                <Input
                  id="saleDate"
                  type="date"
                  max={today}
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                />
              </Field>

              <Field
                label="Flock"
                htmlFor="flockId"
                hint="Optional."
                error={fieldErrors.flockId}
              >
                <Select
                  id="flockId"
                  value={flockId}
                  onChange={(event) => setFlockId(event.target.value)}
                >
                  <option value="">Not tied to a flock</option>
                  {flocks.map((flock) => (
                    <option key={flock.id} value={flock.id}>
                      {flock.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <CustomerPicker
              customers={customers}
              customerId={customerId}
              onSelect={setCustomerId}
              onAdded={(customer) => {
                setCustomers((current) =>
                  [...current, customer].sort((a, b) => a.name.localeCompare(b.name))
                );
                setCustomerId(customer.id);
              }}
            />
          </Panel>

          <Panel
            title="What you sold"
            bodyClassName="flex flex-col gap-4"
            action={
              <span className="text-xs text-muted-foreground tabular">
                {formatNumber(derived.summary.totalEggs)} eggs
              </span>
            }
          >
            {lines.map((line, index) => {
              const size = sizes.find((option) => option.eggSizeId === line.eggSizeId);
              const subtotal = saleItemSubtotal(derived.parsed[index]);

              return (
                <div
                  key={line.key}
                  className="flex flex-col gap-3 rounded-md border border-border p-3"
                >
                  <div className="flex items-end gap-3">
                    <Field
                      label="Egg size"
                      htmlFor={`size-${line.key}`}
                      className="flex-1"
                    >
                      <Select
                        id={`size-${line.key}`}
                        value={line.eggSizeId}
                        onChange={(event) => onSizeChange(line.key, event.target.value)}
                      >
                        {sizes.map((option) => (
                          <option key={option.eggSizeId} value={option.eggSizeId}>
                            {option.name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setLines((current) => current.filter((row) => row.key !== line.key))
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                        <span className="sr-only">Remove {size?.name ?? "this"} line</span>
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Trays" htmlFor={`trays-${line.key}`}>
                      <NumberInput
                        id={`trays-${line.key}`}
                        min={0}
                        placeholder="0"
                        value={line.trays}
                        onChange={(event) => updateLine(line.key, { trays: event.target.value })}
                      />
                    </Field>

                    <Field label="Loose eggs" htmlFor={`eggs-${line.key}`}>
                      <NumberInput
                        id={`eggs-${line.key}`}
                        min={0}
                        placeholder="0"
                        value={line.eggs}
                        onChange={(event) => updateLine(line.key, { eggs: event.target.value })}
                      />
                    </Field>

                    <Field label="Price per tray" htmlFor={`ptray-${line.key}`}>
                      <NumberInput
                        id={`ptray-${line.key}`}
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        adornment={symbol}
                        value={line.pricePerTray}
                        onChange={(event) =>
                          updateLine(line.key, { pricePerTray: event.target.value })
                        }
                      />
                    </Field>

                    <Field label="Price per egg" htmlFor={`pegg-${line.key}`}>
                      <NumberInput
                        id={`pegg-${line.key}`}
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        adornment={symbol}
                        value={line.pricePerEgg}
                        onChange={(event) =>
                          updateLine(line.key, { pricePerEgg: event.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <p className="text-right text-sm tabular text-muted-foreground">
                    Line total{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </p>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() => setLines((current) => [...current, blankLine(sizes[0])])}
              disabled={!canAddLine}
            >
              <Plus className="size-4" aria-hidden />
              Add another size
            </Button>

            {/* Warns, never blocks. The sale still saves and inventory shows
                the shortfall in red, because the records are usually what is
                behind, not the farmer. */}
            {derived.warnings.map((warning) => (
              <StatusNote key={warning.eggSizeId} tone="warn">
                {warning.message} You can still record it — your stock will show as negative
                until the collection is entered.
              </StatusNote>
            ))}

            {fieldErrors.lines && <StatusNote tone="bad">{fieldErrors.lines}</StatusNote>}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Payment" bodyClassName="flex flex-col gap-4">
            <dl
              aria-live="polite"
              className="flex items-baseline justify-between rounded-lg bg-muted p-3"
            >
              <dt className="text-sm text-muted-foreground">Sale total</dt>
              <dd className="tabular text-2xl font-bold">
                {formatCurrency(derived.summary.total, currency)}
              </dd>
            </dl>

            <Field
              label="Amount paid"
              htmlFor="amountPaid"
              hint="Leave at zero if it went out on credit."
              error={fieldErrors.amountPaid}
            >
              <NumberInput
                id="amountPaid"
                min={0}
                step="0.01"
                placeholder="0.00"
                adornment={symbol}
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
              />
            </Field>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmountPaid(String(derived.summary.total))}
              disabled={derived.summary.total <= 0}
            >
              Paid in full
            </Button>

            {/* Derived, never typed. Letting the farmer pick both an amount and
                a status invites a sale marked PAID with nothing against it. */}
            <div
              aria-live="polite"
              className="flex items-center justify-between border-t border-border pt-3"
            >
              <span className="text-sm text-muted-foreground">Status</span>
              <PaymentBadge status={derived.status} />
            </div>

            {derived.outstanding > 0 && (
              <p className="text-right text-sm tabular">
                <span className="text-muted-foreground">Still owed </span>
                <span className="font-semibold text-[hsl(var(--status-warn))]">
                  {formatCurrency(derived.outstanding, currency)}
                </span>
              </p>
            )}

            <Field label="Notes" htmlFor="notes" hint="Optional." error={fieldErrors.notes}>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Delivered to the store"
              />
            </Field>
          </Panel>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        block
        loading={pending}
        disabled={sizes.length === 0}
        className="sticky bottom-20 lg:bottom-4"
      >
        <ShoppingCart className="size-4" aria-hidden />
        {pending ? "Saving…" : "Record sale"}
      </Button>
    </form>
  );
}

/**
 * Pick a customer, or add one without leaving the sale.
 *
 * Walk-in cash sales are the common case, so "no customer" is the default and
 * a valid answer. A farmer part-way through a sale to a new sari-sari store
 * should not have to abandon it to go and create a record first.
 */
function CustomerPicker({
  customers,
  customerId,
  onSelect,
  onAdded,
}: {
  customers: CustomerOption[];
  customerId: string;
  onSelect: (id: string) => void;
  onAdded: (customer: CustomerOption) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);

    startTransition(async () => {
      const result = await createCustomerAction({ name, phone });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onAdded(result.data);
      setName("");
      setPhone("");
      setAdding(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Customer" htmlFor="customerId" hint="Optional — leave blank for a walk-in.">
        <Select
          id="customerId"
          value={customerId}
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="">Walk-in / no customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </Select>
      </Field>

      {adding ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          {error && <StatusNote tone="bad">{error}</StatusNote>}

          <Field label="Name" htmlFor="newCustomerName">
            <Input
              id="newCustomerName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tindahan ni Aling Maria"
              autoFocus
            />
          </Field>

          <Field label="Phone" htmlFor="newCustomerPhone" hint="Optional.">
            <Input
              id="newCustomerPhone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0917 555 0101"
            />
          </Field>

          <div className="flex gap-2">
            <Button type="button" size="sm" loading={pending} onClick={save} disabled={!name.trim()}>
              Add customer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" aria-hidden />
            New customer
          </Button>
        </div>
      )}
    </div>
  );
}
