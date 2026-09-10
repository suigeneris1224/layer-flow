"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FlaskConical, LayoutDashboard, LifeBuoy, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/email-logs", label: "Email logs", icon: Mail },
  { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy },
  { href: "/admin/beta-settings", label: "Beta settings", icon: FlaskConical },
] as const;

/**
 * `/admin` itself only matches exactly -- every other route is also a prefix
 * of nothing here (they're siblings, not nested under each other), so a
 * plain startsWith is safe for the rest.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Fixed desktop sidebar for app/admin/ -- mirrors components/nav/sidebar-nav.tsx's pattern. */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="size-[18px] shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Horizontal pill row, mobile only -- collapses the sidebar above `lg`. */
export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="scroll-x flex gap-1.5 border-b border-border bg-surface px-4 py-2 lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
              active
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "border-input bg-surface hover:border-foreground/30 hover:bg-muted"
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
