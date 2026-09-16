"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ClipboardList, PhilippinePeso, Plus, Receipt, X, type LucideIcon } from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";

/** How long the sheet takes to slide out -- keep in sync with the `duration-*` class below. */
const CLOSE_TRANSITION_MS = 320;

/**
 * The "+" action from the mobile tab bar.
 *
 * Recording production is the primary job, so its tile comes first and gets
 * initial focus when the sheet opens. Sales and expenses sit beside/below it
 * at equal visual weight -- once a farmer can record money at all, none of
 * the three is more "primary" than the others.
 */
export function QuickAdd({ canManageMoney }: { canManageMoney: boolean }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const firstTileRef = useRef<HTMLAnchorElement>(null);

  function show() {
    setOpen(true);
    // Two frames: the first paints the sheet off-screen, the second flips the
    // class that animates it in. One frame is sometimes enough, but two is
    // what reliably survives a busy main thread.
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function hide() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), CLOSE_TRANSITION_MS);
  }

  useEffect(() => {
    if (!open) return;

    firstTileRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card transition-transform active:scale-95"
      >
        <Plus className={cn("size-6 transition-transform duration-200", visible && "rotate-45")} aria-hidden />
        <span className="sr-only">Add a record</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add a record"
          className={cn(
            "fixed inset-0 z-50 flex flex-col justify-end bg-foreground/40 transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0"
          )}
          onClick={hide}
        >
          <div
            className={cn(
              "rounded-t-2xl bg-surface p-4 pb-safe shadow-pop transition-transform duration-[320ms] ease-sheet",
              visible ? "translate-y-0" : "translate-y-full"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add a record</h2>
              <button
                type="button"
                onClick={hide}
                className="flex size-11 items-center justify-center rounded-md transition-colors hover:bg-muted"
              >
                <X className="size-5" aria-hidden />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <QuickAddTile
                ref={firstTileRef}
                href="/production/new"
                label="Record production"
                icon={ClipboardList}
                tint="green"
                delayMs={0}
                onNavigate={hide}
              />

              {canManageMoney ? (
                <QuickAddTile
                  href="/sales/new"
                  label="Record sale"
                  icon={PhilippinePeso}
                  tint="teal"
                  delayMs={40}
                  onNavigate={hide}
                />
              ) : (
                <QuickAddSecondary label="Record sale" icon={PhilippinePeso} tint="teal" delayMs={40} />
              )}

              {canManageMoney ? (
                <QuickAddTile
                  href="/expenses/new"
                  label="Record expense"
                  icon={Receipt}
                  tint="rose"
                  delayMs={80}
                  onNavigate={hide}
                  className="col-span-2"
                />
              ) : (
                <QuickAddSecondary
                  label="Record expense"
                  icon={Receipt}
                  tint="rose"
                  delayMs={80}
                  className="col-span-2"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface QuickAddTileProps {
  href: Route;
  label: string;
  icon: LucideIcon;
  tint: ChipTint;
  /** Stagger offset so tiles land one after another instead of all at once. */
  delayMs: number;
  onNavigate: () => void;
  className?: string;
}

function QuickAddTile({
  ref,
  href,
  label,
  icon,
  tint,
  delayMs,
  onNavigate,
  className,
}: QuickAddTileProps & { ref?: React.Ref<HTMLAnchorElement> }) {
  return (
    <Link
      ref={ref}
      href={href}
      onClick={onNavigate}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 text-center transition-[opacity,transform] duration-300 ease-out active:scale-[0.97]",
        "opacity-0 translate-y-2 [.translate-y-0_&]:opacity-100 [.translate-y-0_&]:translate-y-0",
        className
      )}
    >
      <IconChip icon={icon} tint={tint} size="lg" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function QuickAddSecondary({
  label,
  icon: Icon,
  tint,
  delayMs,
  className,
}: {
  label: string;
  icon: LucideIcon;
  tint: ChipTint;
  delayMs: number;
  className?: string;
}) {
  return (
    <span
      aria-disabled="true"
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        "relative flex min-h-24 cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 text-center opacity-60 transition-[opacity,transform] duration-300 ease-out",
        "translate-y-2 [.translate-y-0_&]:translate-y-0",
        className
      )}
    >
      <span className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted">
        Soon
      </span>
      <IconChip icon={Icon} tint={tint} size="lg" />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </span>
  );
}
