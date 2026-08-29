"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { createCustomerAction, deleteCustomerAction, updateCustomerAction } from "./actions";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
}

const NEW = "__new__";

/**
 * Add a customer, or pick one to edit or delete.
 *
 * Same select-driven shape as HouseForm and PriceForm -- customers are few
 * enough per farm that a dedicated page per row isn't warranted.
 */
export function CustomerForm({
  customers,
  canAdd,
}: {
  customers: CustomerOption[];
  canAdd: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(canAdd ? NEW : (customers[0]?.id ?? NEW));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const editing = customers.find((customer) => customer.id === selected) ?? null;

  const [name, setName] = useState(editing?.name ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [address, setAddress] = useState(editing?.address ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  function onSelect(nextId: string) {
    setSelected(nextId);
    const next = customers.find((customer) => customer.id === nextId) ?? null;
    setName(next?.name ?? "");
    setPhone(next?.phone ?? "");
    setAddress(next?.address ?? "");
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

    startTransition(async () => {
      const values = { name, phone, address, notes };
      const result = editing
        ? await updateCustomerAction(editing.id, values)
        : await createCustomerAction(values);

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(editing ? "Customer updated." : "Customer added.");
      if (!editing) {
        setName("");
        setPhone("");
        setAddress("");
        setNotes("");
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!editing) return;
    if (!window.confirm(`Delete ${editing.name}? This cannot be undone.`)) return;

    setFormError(null);
    startTransition(async () => {
      const result = await deleteCustomerAction(editing.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onSelect(NEW);
      router.refresh();
    });
  }

  return (
    <Panel title={editing ? `Edit ${editing.name}` : "Add a customer"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        {customers.length > 0 && (
          <Field label="Customer" htmlFor="customer-select">
            <Select
              id="customer-select"
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
            >
              {canAdd && <option value={NEW}>+ Add a new customer</option>}
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Name" htmlFor="customer-name" error={fieldErrors.name}>
          <Input
            id="customer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!fieldErrors.name}
          />
        </Field>

        <Field label="Phone" htmlFor="customer-phone" hint="Optional." error={fieldErrors.phone}>
          <Input
            id="customer-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field
          label="Address"
          htmlFor="customer-address"
          hint="Optional."
          error={fieldErrors.address}
        >
          <Input
            id="customer-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </Field>

        <Field label="Notes" htmlFor="customer-notes" hint="Optional." error={fieldErrors.notes}>
          <Textarea
            id="customer-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending} disabled={!name}>
            <Users className="size-4" aria-hidden />
            {pending ? "Saving…" : editing ? "Save changes" : "Add customer"}
          </Button>

          {editing && (
            <Button type="button" variant="outline" loading={pending} onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>

        {!editing && !canAdd && (
          <p className="text-xs text-muted-foreground">
            You&apos;ve reached your plan&apos;s customer limit — editing or deleting existing
            customers is still available above.
          </p>
        )}
      </form>
    </Panel>
  );
}
