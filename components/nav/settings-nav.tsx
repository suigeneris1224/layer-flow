"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SETTINGS_CATEGORIES } from "@/lib/domain/settings-categories";

/**
 * The Settings nav for tablet/desktop (app/(app)/settings/layout.tsx): a
 * "Settings > [current tab]" breadcrumb over an underline tab row. Mobile
 * never renders this -- it keeps the hub-grid-then-full-page flow at bare
 * /settings.
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
      <div className="flex items-center gap-1.5 pb-3 text-base">
        <Link
          href="/settings"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Settings
        </Link>
        {current && (
          <>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-medium">{current.title}</span>
          </>
        )}
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
