"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/domain/expenses";
import { currencySymbol } from "@/lib/format";
import type { ExpenseCategory } from "@/lib/types/database";
import { recordExpenseAction } from "../actions";

interface FlockOption {
  id: string;
  name: string;
}

export function ExpenseForm({
  flocks,
  today,
  currency,
}: {
  flocks: FlockOption[];
  today: string;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<ExpenseCategory>("FEED");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [flockId, setFlockId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await recordExpenseAction({
        category,
        description,
        amount,
        expenseDate,
        flockId,
      });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      router.push("/expenses");
      router.refresh();
    });
  }

  return (
    <Panel title="Expense details">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}

        <Field label="Category" htmlFor="expense-category" error={fieldErrors.category}>
          <Select
            id="expense-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
          >
            {EXPENSE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {EXPENSE_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Amount"
          htmlFor="expense-amount"
          error={fieldErrors.amount}
        >
          <NumberInput
            id="expense-amount"
            adornment={currencySymbol(currency)}
            step="0.01"
            min={0.01}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!!fieldErrors.amount}
          />
        </Field>

        <Field label="Date" htmlFor="expense-date" error={fieldErrors.expenseDate}>
          <Input
            id="expense-date"
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
            aria-invalid={!!fieldErrors.expenseDate}
          />
        </Field>

        {flocks.length > 0 && (
          <Field
            label="Flock"
            htmlFor="expense-flock"
            hint="Optional — attribute this cost to a specific flock."
          >
            <Select
              id="expense-flock"
              value={flockId}
              onChange={(event) => setFlockId(event.target.value)}
            >
              <option value="">No specific flock</option>
              {flocks.map((flock) => (
                <option key={flock.id} value={flock.id}>
                  {flock.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field
          label="Description"
          htmlFor="expense-description"
          hint="Optional."
          error={fieldErrors.description}
        >
          <Textarea
            id="expense-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <Button type="submit" loading={pending} disabled={!amount || !expenseDate}>
          <Receipt className="size-4" aria-hidden />
          {pending ? "Saving…" : "Record expense"}
        </Button>
      </form>
    </Panel>
  );
}
