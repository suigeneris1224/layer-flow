"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * A centered overlay dialog. Escape and a click on the backdrop both close
 * it, same idiom as components/ui/info-tip.tsx's click-outside dismissal,
 * just promoted to a full modal for forms too big for an inline popover
 * (see app/admin/subscriptions/override-modal.tsx, the first caller).
 */
const SIZES = {
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** "lg" gives a dialog more room. Every existing caller keeps the "md" default. */
  size?: keyof typeof SIZES;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    // Body scroll is locked while a modal covers the page, restored on close
    // -- otherwise the page behind it scrolls along with the dialog on touch.
    // `overflow: hidden` alone is a well-known no-op for touch scrolling on
    // iOS Safari, which still lets the page rubber-band/scroll underneath a
    // finger dragging inside the modal (e.g. to reposition a photo crop) --
    // a non-passive `touchmove` listener is needed to actually stop it there.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onTouchMove = (event: TouchEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) event.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("touchmove", onTouchMove);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex w-full flex-col rounded-lg border border-border bg-surface shadow-pop",
          SIZES[size]
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className={cn("size-4")} aria-hidden />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
