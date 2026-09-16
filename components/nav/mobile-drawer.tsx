"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/nav/brand";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { SubscriptionCard } from "@/components/nav/subscription-card";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/lib/types/database";

/** How long the panel takes to slide out -- keep in sync with the `duration-*` class below. */
const CLOSE_TRANSITION_MS = 320;

/**
 * The sidebar as a slide-in drawer, for screens below `lg`.
 *
 * Secondary navigation: the bottom tab bar remains primary on a phone. This is
 * where the full grouped list and the plan card live.
 */
export function MobileDrawer({ plan }: { plan: SubscriptionPlan }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  function show() {
    setOpen(true);
    // Two frames: the first paints the panel off-screen, the second flips the
    // class that slides it in -- same trick as quick-add.tsx's sheet.
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function hide() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), CLOSE_TRANSITION_MS);
  }

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };

    document.addEventListener("keydown", onKeyDown);
    // Stop the page scrolling behind the drawer.
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex size-11 items-center justify-center rounded-md hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Open menu</span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={cn(
              "fixed inset-0 z-[50] flex lg:hidden transition-opacity duration-200",
              visible ? "opacity-100" : "opacity-0"
            )}
            onClick={hide}
          >
            <div className="absolute inset-0 bg-foreground/40" />

            <div
              className={cn(
                "relative flex h-dvh w-[min(85vw,300px)] flex-col bg-surface shadow-pop transition-transform duration-[320ms] ease-sheet",
                visible ? "translate-x-0" : "-translate-x-full"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-4">
                <Brand />
                <button
                  ref={closeRef}
                  type="button"
                  onClick={hide}
                  className="flex size-11 items-center justify-center rounded-md transition-colors hover:bg-muted"
                >
                  <X className="size-5" aria-hidden />
                  <span className="sr-only">Close menu</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pb-4">
                <SidebarNav onNavigate={hide} />
              </div>

              <div className="p-3 pb-safe">
                <SubscriptionCard plan={plan} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
