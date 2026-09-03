"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "i" button: click (not hover) to reveal a short definition, click
 * outside or Escape to dismiss. Hover-only tooltips don't work on the
 * touchscreens this app is mostly used on, so this follows the same
 * click-toggle-plus-outside-click idiom as NotificationMenu/UserMenu rather
 * than a CSS-hover tooltip.
 */
export function InfoTip({
  label,
  children,
  className,
}: {
  /** Accessible name for the trigger, e.g. "About avg laying rate". */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrapper} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={label}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <Info className="size-3.5" aria-hidden />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-40 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-2.5 text-xs font-normal leading-relaxed text-muted-foreground shadow-pop"
        >
          {children}
        </div>
      )}
    </span>
  );
}
