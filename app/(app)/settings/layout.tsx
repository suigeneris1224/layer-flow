import { requireFarmContext } from "@/lib/auth/session";
import { visibleSettingsCategories } from "@/lib/domain/settings-categories";
import { PLANS } from "@/lib/subscriptions/plans";
import { effectivePlan } from "@/lib/subscriptions/entitlements";
import { SettingsNav } from "@/components/nav/settings-nav";
import { PendingSyncPill } from "@/components/offline/pending-sync-pill";

/**
 * Shell for every /settings/* route: a tab bar at tablet/desktop (`md:` and
 * up), content below, so switching tabs doesn't reload the shell. Below
 * `md`, the tab bar is hidden and mobile falls back to the hub-grid page.
 * SettingsNav supplies the only heading at this breakpoint, and owns the
 * `<PageShell>` wrapping each tab used to do itself.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const context = await requireFarmContext();
  const categories = visibleSettingsCategories(context);

  const planName = PLANS[effectivePlan(context.plan, context.subscriptionStatus)].name;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 lg:gap-5 lg:p-6">
      <div className="hidden md:block">
        <SettingsNav
          visibleKeys={categories.map((category) => category.key)}
          badges={{
            subscription: (
              <span className="text-xs font-normal text-muted-foreground">{planName}</span>
            ),
            "data-sync": <PendingSyncPill />,
          }}
        />
      </div>

      <div className="flex flex-col gap-4 lg:gap-5">{children}</div>
    </div>
  );
}
