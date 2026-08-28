import { Brand } from "@/components/nav/brand";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { SubscriptionCard } from "@/components/nav/subscription-card";
import type { SubscriptionPlan } from "@/lib/types/database";

/** Fixed sidebar, desktop only. The drawer covers mobile. */
export function DesktopSidebar({ plan }: { plan: SubscriptionPlan }) {
  return (
    <aside className="hidden w-sidebar shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="px-5 py-5">
        <Brand />
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <SidebarNav />
      </div>

      <div className="p-3">
        <SubscriptionCard plan={plan} />
      </div>
    </aside>
  );
}
