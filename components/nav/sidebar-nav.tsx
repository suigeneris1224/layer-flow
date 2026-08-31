"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type NavItem } from "@/components/nav/routes";

/**
 * The href of the one nav item that should light up, or null.
 *
 * Longest match wins. A plain prefix test lit up two rows at once on nested
 * routes -- /expenses/categories matched both "Expenses" (/expenses) and
 * "Categories" -- which made the sidebar look like the farmer was in two
 * places. Only the most specific match is the page they are on.
 */
function activeHref(pathname: string): string | null {
  let best: string | null = null;

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.comingSoon) continue;
      const href = item.href;
      const matches = pathname === href || pathname.startsWith(`${href}/`);
      if (matches && (best === null || href.length > best.length)) best = href;
    }
  }

  return best;
}

/**
 * The grouped navigation list, shared by the desktop sidebar and the mobile
 * drawer so the two can never drift apart.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav aria-label="Main" className="flex flex-col gap-5 px-3">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          )}

          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.key}>
                <NavRow item={item} current={current} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavRow({
  item,
  current,
  onNavigate,
}: {
  item: NavItem;
  /** The single active href for this pathname, from `activeHref`. */
  current: string | null;
  onNavigate?: () => void;
}) {
  if (item.comingSoon) {
    return (
      <span
        aria-disabled="true"
        className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm text-muted-foreground/55"
      >
        <item.icon className="size-[18px] shrink-0" aria-hidden />
        <span className="truncate">{item.label}</span>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wide">Soon</span>
      </span>
    );
  }

  const active = current === item.href;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
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
}
