import { MobileDrawer } from "@/components/nav/mobile-drawer";
import { NotificationMenu } from "@/components/layout/notification-menu";
import { PendingCountBadge } from "@/components/offline/pending-count-badge";
import { UserMenu } from "@/components/layout/user-menu";
import type { Notification } from "@/lib/data/notifications";
import type { SubscriptionPlan } from "@/lib/types/database";

/**
 * The bar above every signed-in screen.
 *
 * The notification bell surfaces alerts the dashboard has already computed --
 * see lib/domain/alerts.ts and lib/data/notifications.ts -- rather than a
 * second alerting system of its own.
 */
export function AppTopbar({
  greeting,
  farmName,
  userName,
  role,
  avatarUrl,
  plan,
  notifications,
  unreadCount,
  timezone,
  dateLabel,
  canManageBilling,
}: {
  greeting: string;
  farmName: string;
  userName: string;
  role: string;
  avatarUrl?: string | null;
  plan: SubscriptionPlan;
  notifications: Notification[];
  unreadCount: number;
  timezone: string;
  dateLabel: string;
  canManageBilling: boolean;
}) {
  const firstName = userName.split(" ")[0] || "there";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:px-6">
      <MobileDrawer plan={plan} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold sm:text-base">
          {greeting}, {firstName}! <span aria-hidden>👋</span>
        </p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          Here is what is happening at {farmName} today.
        </p>
      </div>

      <span className="hidden items-center rounded-md border border-border px-3 py-2 text-xs text-muted-foreground tabular xl:inline-flex">
        {dateLabel}
      </span>

      <PendingCountBadge />

      <NotificationMenu notifications={notifications} unreadCount={unreadCount} timezone={timezone} />

      <UserMenu
        userName={userName}
        role={role}
        avatarUrl={avatarUrl}
        canManageBilling={canManageBilling}
      />
    </header>
  );
}
