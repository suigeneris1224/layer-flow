import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The closing call to action on a marketing page.
 *
 * `tone="dark"` is the fixed brand-green band (--band-* tokens, rescoped via
 * `.band-scope` so text-foreground/text-muted-foreground resolve to light-on-
 * dark). `tone="soft"` is the lighter sage card used mid-page.
 */
export function CtaBand({
  title,
  lead,
  primary = { href: "/signup", label: "Start free" },
  secondary,
  tone = "dark",
}: {
  title: string;
  lead?: string;
  primary?: { href: Route; label: string };
  secondary?: { href: Route; label: string };
  tone?: "dark" | "soft";
}) {
  const dark = tone === "dark";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 lg:py-16">
      <div
        className={cn(
          "relative flex flex-col items-start gap-6 overflow-hidden rounded-2xl px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between",
          dark ? "band-scope bg-band-bg text-band-foreground" : "border border-border bg-section"
        )}
      >
        {dark && (
          <div
            className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-brand/20 blur-3xl"
            aria-hidden
          />
        )}
        <div className="relative max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{title}</h2>
          {lead && <p className="mt-2 text-muted-foreground">{lead}</p>}
        </div>
        <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href={primary.href}
            className={cn(
              buttonVariants({ variant: "primary", size: "lg" }),
              // Inverted on the dark band: light fill, band-green text.
              dark && "bg-band-foreground text-band-bg hover:bg-band-foreground/90",
              "w-full sm:w-auto"
            )}
          >
            {primary.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                dark && "border-band-foreground/30 bg-transparent text-band-foreground hover:bg-band-foreground/10",
                "w-full sm:w-auto"
              )}
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
