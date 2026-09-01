import type { Metadata } from "next";
import { requireFarmContext } from "@/lib/auth/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { NotificationRow } from "@/components/notifications/notification-row";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

export const metadata: Metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

/**
 * The dedicated notifications screen.
 *
 * The topbar's dropdown (components/layout/notification-menu.tsx) is a lg+
 * affordance -- on a phone there is no room for a floating panel next to the
 * bottom tab bar, so the bell links here instead. Same data, same
 * NotificationRow, just a full-width list rather than a popover.
 */
export default async function NotificationsPage() {
  const context = await requireFarmContext();
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(context),
    getUnreadNotificationCount(context),
  ]);

  return (
    <PageShell width="reading">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
            : "You're all caught up."
        }
        action={unreadCount > 0 ? <MarkAllReadButton /> : undefined}
      />

      <Panel bodyClassName="p-0">
        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No alerts. Everything looks normal.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationRow notification={notification} timezone={context.timezone} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </PageShell>
  );
}
