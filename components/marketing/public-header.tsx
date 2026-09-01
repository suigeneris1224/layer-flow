import Link from "next/link";
import { Brand } from "@/components/nav/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Header shared by every public (signed-out) page.
 *
 * Nav is deliberately short: `Features` and `Pricing` are the only two items
 * with something real behind them. The spec this was built from also asked
 * for `Product` and `Resources`, but nothing in the app backs either yet, and
 * a nav item that goes nowhere is worse than a shorter nav.
 */
export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
      <Link href="/" className="shrink-0">
        <Brand />
      </Link>

      <nav className="flex items-center gap-1.5">
        <Link
          href="/#features"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
        >
          Pricing
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "hidden sm:inline-flex")}
        >
          Start free
        </Link>
      </nav>
    </header>
  );
}
