"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardList, PhilippinePeso, Plus, Receipt, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "+" action from the mobile tab bar.
 *
 * Recording production is the primary job, so it sits first and is styled as
 * the only filled item. Sales and expenses are secondary.
 */
export function QuickAdd({ canManageMoney }: { canManageMoney: boolean }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-card transition-transform active:scale-95"
      >
        <Plus className="size-6" aria-hidden />
        <span className="sr-only">Add a record</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add a record"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-foreground/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="rounded-t-2xl bg-surface p-4 pb-safe"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add a record</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-11 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="size-5" aria-hidden />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href="/production/new"
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center gap-3 rounded-lg bg-primary px-4 font-medium text-primary-foreground"
                >
                  <ClipboardList className="size-5" aria-hidden />
                  Record production
                </Link>
              </li>

              {canManageMoney ? (
                <li>
                  <Link
                    href="/sales/new"
                    onClick={() => setOpen(false)}
                    className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-4 font-medium"
                  >
                    <PhilippinePeso className="size-5" aria-hidden />
                    Record sale
                  </Link>
                </li>
              ) : (
                <QuickAddSecondary
                  label="Record sale"
                  icon={PhilippinePeso}
                  available={false}
                />
              )}
              {canManageMoney ? (
                <li>
                  <Link
                    href="/expenses/new"
                    onClick={() => setOpen(false)}
                    className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-4 font-medium"
                  >
                    <Receipt className="size-5" aria-hidden />
                    Record expense
                  </Link>
                </li>
              ) : (
                <QuickAddSecondary
                  label="Record expense"
                  icon={Receipt}
                  available={false}
                />
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function QuickAddSecondary({
  label,
  icon: Icon,
  available,
}: {
  label: string;
  icon: typeof PhilippinePeso;
  available: boolean;
}) {
  return (
    <li>
      <span
        aria-disabled="true"
        className={cn(
          "flex min-h-14 cursor-not-allowed items-center gap-3 rounded-lg border border-border px-4",
          available ? "text-muted-foreground" : "text-muted-foreground/60"
        )}
      >
        <Icon className="size-5" aria-hidden />
        {label}
        <span className="ml-auto text-xs uppercase tracking-wide">Soon</span>
      </span>
    </li>
  );
}
