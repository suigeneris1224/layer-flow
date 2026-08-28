"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/nav/brand";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { SubscriptionCard } from "@/components/nav/subscription-card";
import type { SubscriptionPlan } from "@/lib/types/database";

/**
 * The sidebar as a slide-in drawer, for screens below `lg`.
 *
 * Secondary navigation: the bottom tab bar remains primary on a phone. This is
 * where the full grouped list and the plan card live.
 */
export function MobileDrawer({ plan }: { plan: SubscriptionPlan }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    // Stop the page scrolling behind the drawer.
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex size-11 items-center justify-center rounded-md hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Open menu</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 flex lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-foreground/40" />

          <div
            className="relative flex h-full w-[min(85vw,300px)] flex-col bg-surface shadow-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <Brand />
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-11 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="size-5" aria-hidden />
                <span className="sr-only">Close menu</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-4">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>

            <div className="p-3 pb-safe">
              <SubscriptionCard plan={plan} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
