import Link from "next/link";
import type { Route } from "next";
import { Brand } from "@/components/nav/brand";

const COLUMNS: { title: string; links: { href: Route; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/docs", label: "Documentation" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms and Conditions" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Start free" },
    ],
  },
];

/**
 * Footer shared by every public (signed-out) page. Only real routes.
 *
 * Light sage, not a dark band: the marketing pages already close on a dark
 * green CTA band (components/marketing/cta-band.tsx), and two dark blocks in
 * a row read as one heavy slab.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-section">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-3 lg:grid-cols-[1.6fr_repeat(5,1fr)]">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 [&>div]:items-start">
          <Brand />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Simple farm management for Philippine layer farmers. Track your flock, feed, and
            finances in one place.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title} className="flex flex-col gap-2.5 text-sm">
            <span className="font-semibold text-foreground">{column.title}</span>
            {column.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-primary-strong"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 px-4 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} LayerFlow. All rights reserved.</span>
          <span aria-hidden>·</span>
          <span>Powered by SinSoft</span>
        </div>
      </div>
    </footer>
  );
}
