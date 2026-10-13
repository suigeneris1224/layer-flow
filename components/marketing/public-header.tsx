"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/nav/brand";
import { InstallButton } from "@/components/pwa/install-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
] as const;

/**
 * Header shared by every public (signed-out) page.
 *
 * Every item is a real page -- a nav item that goes nowhere is worse than a
 * shorter nav. Docs and FAQ live in the footer's Resources column instead,
 * which keeps the top bar to what a first-time visitor is choosing between.
 *
 * Below `md`, the nav collapses into a hamburger toggle. Its panel is a
 * normal-flow sibling of the top row (not a fixed/portaled overlay), so
 * opening it grows the header in place and pushes the page content below
 * down, rather than floating over it.
 */
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    // pt-safe: without it, an installed/standalone PWA (appleWebApp.capable
    // + viewportFit: "cover" in app/layout.tsx) renders this header under
    // the iOS status bar instead of below it, so the wordmark collides with
    // the time/battery icons. Already built for this in app/globals.css,
    // just never wired up on the public side (the authenticated app's own
    // topbar doesn't need it -- different header, out of scope here).
    <header className="w-full pt-safe">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <Brand />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hover:text-foreground",
                isActive(link.href) && "bg-section text-primary-strong hover:text-primary-strong"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden md:inline-flex")}
          >
            Log in
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
            className="flex size-11 items-center justify-center rounded-md hover:bg-muted md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu-panel"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-sheet md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <nav
            aria-label="Main"
            className="mx-auto flex w-full max-w-6xl flex-col gap-1 border-t border-border px-4 pb-2 pt-3"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted",
                  isActive(link.href) && "bg-section text-primary-strong"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pb-4">
            <InstallButton />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Log in
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
