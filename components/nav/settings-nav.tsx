"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SETTINGS_CATEGORIES } from "@/lib/domain/settings-categories";

/**
 * The Settings nav for tablet/desktop (app/(app)/settings/layout.tsx): the
 * page's own big title, styled as a "Settings > [current tab]" breadcrumb --
 * "Settings" small and muted, linking back to the hub; the current tab's name
 * takes over as the actual page heading -- over an underline tab row. Mobile
 * never renders this -- it keeps the hub-grid-then-full-page flow at bare
 * /settings, where each tab's own <PageHeader> (shown only below `md`) is the
 * only heading.
 *
 * All 7 tabs genuinely live under /settings/* (Profile/Team/Subscription/
 * Help & Support moved here from their own top-level routes), so every one
 * of them highlights via usePathname() and swaps content in place -- no full
 * navigation for any tab.
 *
 * Imports SETTINGS_CATEGORIES itself rather than receiving it as a prop: its
 * `icon` field is a component function, and a Server Component (the layout)
 * can't pass a function to a Client Component as a prop -- only the
 * serializable list of which keys are visible crosses that boundary.
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
