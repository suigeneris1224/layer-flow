"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BellRing, SlidersHorizontal } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { saveNotificationPreferencesAction } from "./actions";
import { safeAction } from "@/lib/client/safe-action";

export function NotificationToggleForm({
  initialFarmAlertsEnabled,
  initialInventoryAlertsEnabled,
}: {
  initialFarmAlertsEnabled: boolean;
  initialInventoryAlertsEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [farmAlertsEnabled, setFarmAlertsEnabled] = useState(initialFarmAlertsEnabled);
  const [inventoryAlertsEnabled, setInventoryAlertsEnabled] = useState(
    initialInventoryAlertsEnabled
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await safeAction(() =>
        saveNotificationPreferencesAction({
          farmAlertsEnabled,
          inventoryAlertsEnabled,
        })
      );

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setSuccess(true);
      router.refresh();
    });
  }

  return (
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
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">Notification settings saved.</StatusNote>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          <Checkbox
            id="farm-alerts-enabled"
            align="start"
            checked={farmAlertsEnabled}
            onChange={(event) => setFarmAlertsEnabled(event.target.checked)}
            label={
              <span>
                <span className="block font-medium">Farm & production alerts</span>
                <span className="block text-xs text-muted-foreground">
                  Production drops, feed cost rises, mortality, egg size shifts, vaccination
                  gaps, underperforming or losing flocks.
                </span>
              </span>
            }
          />

          <Checkbox
            id="inventory-alerts-enabled"
            align="start"
            checked={inventoryAlertsEnabled}
            onChange={(event) => setInventoryAlertsEnabled(event.target.checked)}
            label={
              <span>
                <span className="block font-medium">Inventory alerts</span>
                <span className="block text-xs text-muted-foreground">
                  Low egg inventory and stale pricing.
                </span>
              </span>
            }
          />
        </div>

        <p className="text-xs text-muted-foreground">
          These only control the notification bell — the dashboard still shows real conditions
          either way.
        </p>

        <div>
          <Button type="submit" loading={pending}>
            <BellRing className="size-4" aria-hidden />
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
