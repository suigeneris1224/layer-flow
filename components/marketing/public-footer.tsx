import Link from "next/link";
import { Brand } from "@/components/nav/brand";

/** Footer shared by every public (signed-out) page. Only real routes. */
export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Brand />
          <p className="mt-3 text-sm text-muted-foreground">
             A modern farm management platform designed for Philippine layer farmers, with local pricing and time settings.
          </p>
        </div>

        <nav className="grid grid-cols-3 gap-8 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Product</span>
            <Link href="/#features" className="text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/signup" className="text-muted-foreground hover:text-foreground">
              Start free
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Company</span>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Legal</span>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </div>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} LayerFlow. All rights reserved.
      </div>
    </footer>
  );
}
