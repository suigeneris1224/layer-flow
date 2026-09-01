"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/data/notifications";
import { NotificationRow } from "@/components/notifications/notification-row";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground tabular">
      {count}
    </span>
  );
}

/**
 * The bell, made real: notifications persisted from the dashboard's own alert
 * rules (lib/data/notifications.ts), not a second alert system of its own.
 *
 * Two surfaces, one data set. Below `lg` -- where a dropdown would fight the
 * bottom tab bar and the drawer for space, and a short tap target is easy to
 * miss -- the bell is a plain link to the dedicated /notifications list page.
 * At `lg` and above it opens this dropdown in place, matching UserMenu. Both
 * render notifications via the same NotificationRow, server-rendered: there
 * is no client fetch here, and the dropdown's rows are server action forms
 * exactly like the full page's.
 */
export function NotificationMenu({
  notifications,
  unreadCount,
  timezone,
}: {
  notifications: Notification[];
  unreadCount: number;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const srLabel = unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications";

  return (
    <div ref={wrapper} className="relative">
      <Link
        href="/notifications"
        className="relative flex size-11 items-center justify-center rounded-md hover:bg-muted lg:hidden"
      >
        <Bell className="size-5" aria-hidden />
        <Badge count={unreadCount} />
        <span className="sr-only">{srLabel}</span>
      </Link>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative hidden size-11 items-center justify-center rounded-md hover:bg-muted lg:flex"
      >
        <Bell className="size-5" aria-hidden />
        <Badge count={unreadCount} />
        <span className="sr-only">{srLabel}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 hidden w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface shadow-pop lg:block"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && <MarkAllReadButton className="text-xs" />}
          </div>

          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No alerts. Everything looks normal.
            </p>
          ) : (
            <ul role="none" className="max-h-96 divide-y divide-border overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id} role="menuitem">
                  <NotificationRow notification={notification} timezone={timezone} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
