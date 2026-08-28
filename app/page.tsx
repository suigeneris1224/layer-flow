import Link from "next/link";
import { ArrowRight, Egg, TrendingUp, Wallet, Wheat } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The chain the product exists to close, in the farmer's own order. */
const FLOW = [
  { icon: Egg, title: "Your eggs", copy: "Log the morning collection in under a minute." },
  { icon: Wheat, title: "Your cost", copy: "Feed and expenses, counted as you go." },
  { icon: Wallet, title: "Your profit", copy: "What the flock actually earned today." },
  { icon: TrendingUp, title: "Your decision", copy: "See a drop early, while you can still act." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-5">
        <span className="inline-flex items-center gap-2 text-lg font-semibold">
          <Egg className="size-5 text-primary" aria-hidden />
          LayerFlow
        </span>

        <nav className="flex items-center gap-1">
          <Link href="/pricing" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Pricing
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Sign in
          </Link>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4">
        <section className="py-12 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            For layer farms in the Philippines
          </p>

          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight lg:text-6xl">
            Know your flock.
            <br />
            Know your numbers.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            LayerFlow turns your daily egg count into the one number that matters: what your farm
            actually earns. Built for 100 to 5,000 hens, and for a phone in a poultry house.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "sm:w-auto")}
            >
              Start free
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "sm:w-auto")}
            >
              See pricing
            </Link>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Free for one flock. No card needed.
          </p>
        </section>

        <section aria-label="How it works" className="grid gap-3 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((step) => (
            <div key={step.title} className="rounded-lg border border-border bg-surface p-4">
              <step.icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-3 font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{step.copy}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground">
          <p>LayerFlow — egg farm management for Philippine layer farmers.</p>
          <p>Prices in PHP. Times in Asia/Manila.</p>
        </div>
      </footer>
    </div>
  );
}
