"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bird, Home, Plus, Warehouse } from "lucide-react";
import { StatusNote } from "@/components/ui/states";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { formatNumber } from "@/lib/format";
import type { FarmRole } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { switchFarmAction } from "@/app/(app)/farms/actions";

export interface FarmCardData {
  farmId: string;
  farmName: string;
  role: FarmRole;
  location: string;
  photoUrl: string | null;
  totalBirds: number;
  houseCount: number;
}

/**
 * Every farm the user belongs to, as a grid of cards -- the currently active
 * one marked with a green dot, the rest gray. Clicking an inactive card
 * switches to it. Shared between /farms (the full picker) and the dashboard's
 * Farms overview panel, so both look and behave the same way.
 *
 * The dashed "Add New Farm" tile deep-links to the create form on /farms
 * (#add-farm) rather than duplicating it here, since the plan-limit /
 * upgrade-prompt branching for creating a farm lives on that page.
 */
export function FarmCards({
  farms,
  activeFarmId,
}: {
  farms: FarmCardData[];
  activeFarmId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSwitch(farmId: string) {
    if (farmId === activeFarmId || pending) return;
    setError(null);
    setSwitchingId(farmId);
    startTransition(async () => {
      const result = await switchFarmAction(farmId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <StatusNote tone="bad">{error}</StatusNote>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {farms.map((farm) => {
          const active = farm.farmId === activeFarmId;
          return (
            <button
              key={farm.farmId}
              type="button"
              onClick={() => onSwitch(farm.farmId)}
              disabled={pending && switchingId !== farm.farmId}
              aria-current={active ? "true" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border bg-surface p-4 text-left transition-colors",
                active
                  ? "border-primary/40"
                  : "border-border hover:border-foreground/30 hover:bg-muted disabled:opacity-60"
              )}
            >
              <span
                className={cn(
                  "absolute right-3 top-3 size-2.5 rounded-full",
                  active ? "bg-good" : "bg-muted-foreground/40"
                )}
                title={active ? "Active" : "Inactive"}
                aria-hidden
              />

              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {farm.photoUrl ? (
                  <Image src={farm.photoUrl} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <Warehouse className="size-6 text-muted-foreground" aria-hidden />
                  </span>
                )}
              </div>

              <div className="min-w-0 pr-4">
                <p className="truncate text-sm font-semibold">{farm.farmName}</p>
                {farm.location && (
                  <p className="truncate text-xs text-muted-foreground">{farm.location}</p>
                )}
                <p className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Bird className="size-3.5" aria-hidden />
                    {formatNumber(farm.totalBirds)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Home className="size-3.5" aria-hidden />
                    {formatNumber(farm.houseCount)}
                  </span>
                  <span>{ROLE_LABELS[farm.role]}</span>
                </p>
              </div>
            </button>
          );
        })}

        <a
          href="/farms?addFarm=1#add-farm"
          className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Warehouse className="size-6" aria-hidden />
          <span className="flex items-center gap-1 font-medium">
            <Plus className="size-4" aria-hidden />
            Add New Farm
          </span>
        </a>
      </div>
    </div>
  );
}
