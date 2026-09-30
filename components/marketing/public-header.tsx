"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/nav/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
] as const;

/**
 * Header shared by every public (signed-out) page.
 *
 * Nav is deliberately short: `How It Works`, `Features`, and `Pricing` are
 * the items with something real behind them. The spec this was built from
 * also asked for `Product` and `Resources`, but nothing in the app backed
 * either at the time -- a nav item that goes nowhere is worse than a shorter
 * nav. Both of the above are now dedicated pages, not just in-page anchors.
 *
 * Below `sm`, the nav collapses into a hamburger toggle. Its panel is a
 * normal-flow sibling of the top row (not a fixed/portaled overlay), so
 * opening it grows the header in place and pushes the page content below
 * down, rather than floating over it.
 */
export function PublicHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="w-full">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="shrink-0">
          <Brand />
        </Link>

        <nav className="flex items-center gap-1.5">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "hidden sm:inline-flex")}
          >
            Start free
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu-panel"
            className="flex size-11 items-center justify-center rounded-md hover:bg-muted sm:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </nav>
      </div>

      <div
        id="mobile-menu-panel"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-sheet sm:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <nav className="mx-auto flex w-full max-w-5xl flex-col gap-1 border-t border-border px-4 pb-2 pt-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 pb-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "primary" }), "w-full")}
            >
              Start free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
