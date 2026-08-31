"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TAB_ITEMS, type NavItem } from "@/components/nav/routes";
import { QuickAdd } from "@/components/nav/quick-add";

/** Home, Stock, +, Money, More (spec section 46). */
export function MobileTabBar({ canManageMoney }: { canManageMoney: boolean }) {
  const pathname = usePathname();
  const [home, stock, money, more] = TAB_ITEMS;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-around px-2">
        <Tab item={home} pathname={pathname} />
        <Tab item={stock} pathname={pathname} />
        <li>
          <QuickAdd canManageMoney={canManageMoney} />
        </li>
        <Tab item={money} pathname={pathname} />
        <Tab item={more} pathname={pathname} />
      </ul>
    </nav>
  );
}

function Tab({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const content = (
    <>
      <item.icon className="size-5" aria-hidden />
      <span className="text-[11px] leading-none">{item.label}</span>
    </>
  );

  if (item.comingSoon) {
    return (
      <li key={item.key}>
        <span
          aria-disabled="true"
          className="flex min-h-14 w-16 cursor-not-allowed flex-col items-center justify-center gap-1 text-muted-foreground/50"
        >
          {content}
        </span>
      </li>
    );
  }

  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <li key={item.key}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 w-16 flex-col items-center justify-center gap-1",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {content}
      </Link>
    </li>
  );
}
