"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  // Horizontal offset (px, relative to the wrapper's own left edge) the
  // tooltip is nudged by so it stays fully on-screen. `null` until measured,
  // which renders as the plain `left-0` default for one frame.
  //
  // A left/right binary flip (an earlier version of this fix) isn't enough:
  // a trigger sitting in the *middle* of a narrow phone screen can have too
  // little room on both sides for the full tooltip width, so "flip to the
  // other side" just moves the overflow from one edge to the other instead
  // of fixing it. Clamping the actual position is the general fix -- it
  // works whether the trigger is near an edge or dead center.
  const [nudge, setNudge] = useState<number | null>(null);
  const wrapper = useRef<HTMLSpanElement>(null);

  // Runs before the browser paints, so the tooltip never flashes at the
  // un-nudged position for a frame -- it appears already in its final spot.
  useLayoutEffect(() => {
    if (!open) return;

    const TOOLTIP_WIDTH = 256; // w-64
    const EDGE_MARGIN = 16;
    const rect = wrapper.current?.getBoundingClientRect();
    if (rect) {
      const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - TOOLTIP_WIDTH - EDGE_MARGIN);
      const clampedViewportLeft = Math.min(Math.max(rect.left, EDGE_MARGIN), maxLeft);
      setNudge(clampedViewportLeft - rect.left);
    }
  }, [open]);

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
          style={nudge !== null ? { left: nudge } : undefined}
          className="absolute left-0 top-full z-40 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-2.5 text-xs font-normal leading-relaxed text-muted-foreground shadow-pop"
        >
          {children}
        </div>
      )}
    </span>
  );
}
