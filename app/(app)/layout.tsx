import { requireFarmContext, requireUser } from "@/lib/auth/session";
import { canManageSales, ROLE_LABELS } from "@/lib/auth/permissions";
import { canAccess } from "@/lib/subscriptions/entitlements";
import { getDashboardData } from "@/lib/data/dashboard";
import { getNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";
import { getProfile } from "@/lib/data/profile";
import { greetingFor } from "@/lib/domain/presentation";
import { farmHour, formatDate } from "@/lib/format";
import { DesktopSidebar } from "@/components/nav/desktop-sidebar";
import { MobileTabBar } from "@/components/nav/mobile-tab-bar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { OfflineStatus } from "@/components/offline/offline-status";

/**
 * Shell for every signed-in screen.
 *
 * requireFarmContext() redirects to /onboarding when the user has no farm yet,
 * so no child page has to defend against a missing farm.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireFarmContext();
  const user = await requireUser();

  // Reconciles today's alerts into notifications before the badge/panel below
  // read them, so this navigation shows the sync it just performed rather than
  // the previous one.
  await getDashboardData(context);
  const [notifications, unreadCount, profile] = await Promise.all([
    getNotifications(context),
    getUnreadNotificationCount(context),
    getProfile(user.id),
  ]);

  // Greeting follows the farm's clock, not the server's: a Manila farmer at
  // 7am should not be told "good evening" because Vercel is on UTC.
  const greeting = greetingFor(farmHour(context.timezone));

  const offlineEnabled = canAccess(
    { plan: context.plan, status: context.subscriptionStatus },
    "offline_mode"
  );

  return (
    <div className="flex min-h-dvh">
      <DesktopSidebar plan={context.plan} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          greeting={greeting}
          farmName={context.farmName}
          userName={profile?.fullName || user.fullName || user.email}
          role={ROLE_LABELS[context.role]}
          avatarUrl={profile?.avatarUrl}
          plan={context.plan}
          notifications={notifications}
          unreadCount={unreadCount}
          timezone={context.timezone}
          dateLabel={formatDate(new Date(), context.timezone)}
        />

        <OfflineStatus offlineEnabled={offlineEnabled} />

        <main id="main" className="flex-1 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      <MobileTabBar canManageMoney={canManageSales(context)} />
    </div>
  );
}
