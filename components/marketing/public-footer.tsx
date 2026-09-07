import Link from "next/link";
import { Brand } from "@/components/nav/brand";

/**
 * Footer shared by every public (signed-out) page. Only real routes.
 *
 * The dark green band is a fixed brand statement (see the --footer-* tokens
 * in app/globals.css), not the site's usual light/dark surface -- so rather
 * than re-color every link and the reused <Brand /> one by one, the three
 * tokens they lean on (--foreground, --muted-foreground, --border) are
 * rescoped to the footer's own values via inline custom properties. Every
 * descendant's existing text-foreground/text-muted-foreground/border classes
 * then resolve correctly here with no changes to those shared components.
 */
export function PublicFooter() {
  return (
    <footer
      className="border-t border-footer-border bg-footer-bg text-footer-foreground"
      style={
        {
          "--foreground": "var(--footer-foreground)",
          "--muted-foreground": "var(--footer-muted-foreground)",
          "--border": "var(--footer-border)",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="[&>div]:items-start">
          <Brand />
          <p className="mt-3 text-sm text-muted-foreground">
            A modern farm management platform designed for Philippine layer farmers, with local
            pricing and time settings.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-foreground">Product</span>
          <Link href="/features" className="text-muted-foreground hover:text-foreground">
            Features
          </Link>
          <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">
            How It Works
          </Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
            Pricing
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-foreground">Company</span>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="text-muted-foreground hover:text-foreground">
            Contact
          </Link>
          <Link href="/faq" className="text-muted-foreground hover:text-foreground">
            FAQ
          </Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">
            Terms and Conditions
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-foreground">Get Started</span>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Login
          </Link>
          <Link href="/signup" className="text-muted-foreground hover:text-foreground">
            Start Free
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} LayerFlow. All rights reserved.
      </div>
    </footer>
  );
}
