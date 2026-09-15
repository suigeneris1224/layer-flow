import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageAlertThresholds } from "@/lib/auth/permissions";
import { getNotificationPreferences } from "@/lib/data/notification-preferences";
import { PageHeader } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationToggleForm } from "./notification-toggle-form";

export const metadata: Metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage() {
  const context = await requireFarmContext();
  const canManage = canManageAlertThresholds(context);
  const prefs = await getNotificationPreferences(context.farmId);

  return (
    <>
      <div className="md:hidden">
        <PageHeader
          title="Notifications"
          description="What LayerFlow should tell you, and when."
        />
      </div>

      {canManage ? (
        <NotificationToggleForm
          initialFarmAlertsEnabled={prefs.farmAlertsEnabled}
          initialInventoryAlertsEnabled={prefs.inventoryAlertsEnabled}
        />
      ) : (
        <Panel
          title="Notifications"
          action={
            <Link
              href="/settings/alerts"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Set alert thresholds
            </Link>
          }
        >
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Farm & production alerts</dt>
              <dd className="text-sm font-medium">{prefs.farmAlertsEnabled ? "On" : "Off"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Inventory alerts</dt>
              <dd className="text-sm font-medium">
                {prefs.inventoryAlertsEnabled ? "On" : "Off"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Only the farm owner or a manager can change these.
          </p>
        </Panel>
      )}
    </>
  );
}
