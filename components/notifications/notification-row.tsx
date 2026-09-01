"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Bell, TriangleAlert } from "lucide-react";
import type { Notification } from "@/lib/data/notifications";
import type { AlertLevel } from "@/lib/domain/alerts";
import { formatRelativeDay } from "@/lib/format";
import { markNotificationReadAction } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

export const NOTIFICATION_TONE: Record<AlertLevel, { chip: string; text: string }> = {
  good: { chip: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
  warn: {
    chip: "bg-[hsl(var(--status-warn))]/20 text-[hsl(var(--status-warn))]",
    text: "text-[hsl(var(--status-warn))]",
  },
  bad: {
    chip: "bg-[hsl(var(--status-bad))]/20 text-[hsl(var(--status-bad))]",
    text: "text-[hsl(var(--status-bad))]",
  },
};

const NOTIFICATION_ICONS: Record<AlertLevel, typeof AlertCircle> = {
  good: Bell,
  warn: TriangleAlert,
  bad: AlertCircle,
};

/**
 * One notification, as a button that marks itself read.
 *
 * A client component so the same row can sit inside the dropdown
 * (components/layout/notification-menu.tsx) and the dedicated
 * /notifications page -- calling the server action directly with
 * useTransition, the pattern this codebase already uses everywhere a mutation
 * needs to report failure (see e.g. house-form.tsx), rather than a plain
 * `<form action>`, since markNotificationReadAction returns an ActionResult.
 */
export function NotificationRow({
  notification,
  timezone,
}: {
  notification: Notification;
  timezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tone = NOTIFICATION_TONE[notification.level];
  const Icon = NOTIFICATION_ICONS[notification.level];
  const unread = notification.resolvedAt === null && notification.readAt === null;

  function onClick() {
    if (!unread) return;
    startTransition(async () => {
      await markNotificationReadAction(notification.id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!unread || pending}
      className={cn(
        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm",
        unread ? "bg-muted/40 hover:bg-muted" : "hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full",
          tone.chip
        )}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block", notification.resolvedAt !== null && "text-muted-foreground")}>
          {notification.message}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {formatRelativeDay(notification.createdAt.slice(0, 10), timezone)}
          {notification.resolvedAt !== null && " · resolved"}
        </span>
      </span>
      {unread && (
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full bg-current", tone.text)} aria-hidden />
      )}
    </button>
  );
}
