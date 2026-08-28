import { Bell } from "lucide-react";
import { MobileDrawer } from "@/components/nav/mobile-drawer";
import { UserMenu } from "@/components/layout/user-menu";
import type { SubscriptionPlan } from "@/lib/types/database";

/**
 * The bar above every signed-in screen.
 *
 * The bell badge counts alerts the dashboard has already computed. It is not a
 * second notification system -- just a surface for the deterministic rules in
 * lib/domain/alerts.ts, which is why it links to the status panel rather than
 * opening a feed of its own.
 */
export function AppTopbar({
  greeting,
  farmName,
  userName,
  role,
  plan,
  alertCount,
  dateLabel,
}: {
  greeting: string;
  farmName: string;
  userName: string;
  role: string;
  plan: SubscriptionPlan;
  alertCount: number;
  dateLabel: string;
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

      <a
        href="#todays-status"
        className="relative flex size-11 items-center justify-center rounded-md hover:bg-muted"
      >
        <Bell className="size-5" aria-hidden />
        {alertCount > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground tabular">
            {alertCount}
          </span>
        )}
        <span className="sr-only">
          {alertCount > 0 ? `${alertCount} alerts need attention` : "No alerts"}
        </span>
      </a>

      <UserMenu userName={userName} role={role} />
    </header>
  );
}
