import type { Metadata } from "next";
import Link from "next/link";
import { Home, Warehouse } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageFarmSettings, canManageHouse } from "@/lib/auth/permissions";
import { SUPPORTED_CURRENCIES, SUPPORTED_TIMEZONES } from "@/lib/domain/farm-config";
import { getFarmDefaults } from "@/lib/data/farm-defaults";
import { PageHeader } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FarmConfigForm } from "./farm-config-form";
import { FarmDefaultsForm } from "./farm-defaults-form";

export const metadata: Metadata = { title: "Farm settings" };

export default async function FarmSettingsPage() {
  const context = await requireFarmContext();
  const canManage = canManageFarmSettings(context);
  const canManageDefaults = canManageHouse(context);
  const defaults = await getFarmDefaults(context.farmId);

  return (
    <>
      <div className="md:hidden">
        <PageHeader title="Farm" description={`Settings for ${context.farmName}.`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
        <Panel title="Farm information">
          <p className="text-sm text-muted-foreground">
            Name, location and photo -- manage these from the Farms page.
          </p>
          <Link
            href="/farms"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
          >
            <Warehouse className="size-4" aria-hidden />
            Open farm information
          </Link>
        </Panel>

        <Panel title="Houses">
          <p className="text-sm text-muted-foreground">
            Add, edit or remove the houses on this farm.
          </p>
          <Link
            href="/houses"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
          >
            <Home className="size-4" aria-hidden />
            Manage houses
          </Link>
        </Panel>

        {canManageDefaults ? (
          <FarmDefaultsForm currentCapacity={defaults.houseCapacity} currentBreed={defaults.flockBreed} />
        ) : (
          <Panel title="Production defaults">
            <dl className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Default house capacity</dt>
                <dd className="text-sm font-medium">{defaults.houseCapacity ?? "None set"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Default flock breed</dt>
                <dd className="text-sm font-medium">{defaults.flockBreed ?? "None set"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Only the farm owner or a manager can change these.
            </p>
          </Panel>
        )}

        {canManage ? (
          <FarmConfigForm currentCurrency={context.currency} currentTimezone={context.timezone} />
        ) : (
          <Panel title="Farm configuration">
            <dl className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Currency</dt>
                <dd className="text-sm font-medium">
                  {SUPPORTED_CURRENCIES.find((c) => c.code === context.currency)?.label ??
                    context.currency}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Timezone</dt>
                <dd className="text-sm font-medium">
                  {SUPPORTED_TIMEZONES.find((t) => t.id === context.timezone)?.label ??
                    context.timezone}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Only the farm owner can change these.
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}
