"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { NotificationRow } from "@/components/notifications/notification-row";
import type { Notification } from "@/lib/data/notifications";
import { loadMoreNotificationsAction } from "./actions";
import { safeAction } from "@/lib/client/safe-action";

/**
 * The notifications list plus a "Load more" for resolved history.
 *
 * Open notifications always arrive complete from the server (see
 * getNotifications) -- only resolved history is paginated, so this only ever
 * appends further resolved rows, never re-fetches what's already shown.
 */
export function NotificationList({
  initialNotifications,
  initialCursor,
  timezone,
}: {
  initialNotifications: Notification[];
  initialCursor: string | null;
  timezone: string;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  function onLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await safeAction(() => loadMoreNotificationsAction(cursor));
      if (!result.ok) return;
      setNotifications((prev) => [...prev, ...result.data.notifications]);
      setCursor(result.data.nextCursor);
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <NotificationRow notification={notification} timezone={timezone} />
          </li>
        ))}
      </ul>
      {cursor && (
        <div className="border-t border-border p-3">
          <Button type="button" variant="outline" loading={pending} onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}
