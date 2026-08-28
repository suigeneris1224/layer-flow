"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type NavItem } from "@/components/nav/routes";

/**
 * The grouped navigation list, shared by the desktop sidebar and the mobile
 * drawer so the two can never drift apart.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

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
                <NavRow item={item} pathname={pathname} onNavigate={onNavigate} />
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
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
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

  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

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
