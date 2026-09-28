"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SETTINGS_CATEGORIES } from "@/lib/domain/settings-categories";

/**
 * The Settings nav for tablet/desktop: the page title styled as a
 * "Settings > [current tab]" breadcrumb over an underline tab row. Mobile
 * never renders this -- it keeps the hub-grid-then-full-page flow instead.
 *
 * Imports SETTINGS_CATEGORIES itself rather than receiving it as a prop:
 * its `icon` field is a component function, which a Server Component parent
 * can't pass across to a Client Component -- only the visible-keys list can.
 */
export function SettingsNav({
  visibleKeys,
  badges,
}: {
  visibleKeys: string[];
  /** Optional trailing status node per category key (e.g. plan name, pending count). */
  badges?: Partial<Record<string, React.ReactNode>>;
}) {
  const pathname = usePathname();
  const categories = SETTINGS_CATEGORIES.filter((category) => visibleKeys.includes(category.key));

  const current = categories.find(
    (category) => pathname === category.href || pathname.startsWith(`${category.href}/`)
  );

  return (
    <div>
      <div className="mb-4">
        {current ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href="/settings"
              className="text-2xl font-bold tracking-tight text-muted-foreground transition-colors hover:text-foreground"
            >
              Settings
            </Link>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
          </div>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        )}
        <p className="mt-0.5 text-sm text-muted-foreground">
          {current?.description ?? "Manage your farm and account."}
        </p>
      </div>

      <nav aria-label="Settings" className="flex gap-5 overflow-x-auto border-b border-border">
        {categories.map((category) => {
          const active = category === current;

          return (
            <Link
              key={category.key}
              href={category.href}
              // Same reasoning as sidebar-nav.tsx's NavRow: every tab here is
              // in the viewport at once.
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 pb-2.5 text-sm transition-colors",
                active
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {category.title}
              {badges?.[category.key] && <span>{badges[category.key]}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
