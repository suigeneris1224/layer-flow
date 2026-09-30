"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/nav/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How long the panel takes to slide out -- keep in sync with the `duration-*` class below. */
const CLOSE_TRANSITION_MS = 320;

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
] as const;

/**
 * The public header's hamburger menu, for screens below `sm`. Same slide-in
 * drawer pattern as the authenticated app's MobileDrawer
 * (components/nav/mobile-drawer.tsx), with the public nav instead of SidebarNav.
 */
export function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  function show() {
    setOpen(true);
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
        className="flex size-11 items-center justify-center rounded-md hover:bg-muted sm:hidden"
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
              "fixed inset-0 z-[50] flex sm:hidden transition-opacity duration-200",
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

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-2">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={hide}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-2 p-3 pb-safe">
                <Link
                  href="/login"
                  onClick={hide}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={hide}
                  className={cn(buttonVariants({ variant: "primary" }), "w-full")}
                >
                  Start free
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
