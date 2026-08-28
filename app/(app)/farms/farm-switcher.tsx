"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { FarmRole } from "@/lib/types/database";
import { switchFarmAction } from "./actions";

interface FarmOption {
  farmId: string;
  farmName: string;
  role: FarmRole;
}

/** Pro-only in practice: every other plan caps farms at one. */
export function FarmSwitcher({
  farms,
  activeFarmId,
}: {
  farms: FarmOption[];
  activeFarmId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSwitch(farmId: string) {
    setError(null);
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
    <div className="flex flex-col gap-2">
      {error && <StatusNote tone="bad">{error}</StatusNote>}

      <ul className="flex flex-col divide-y divide-border">
        {farms.map((farm) => (
          <li
            key={farm.farmId}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{farm.farmName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[farm.role]}</p>
            </div>

            {farm.farmId === activeFarmId ? (
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                <Check className="size-3.5" aria-hidden />
                Active
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={pending}
                onClick={() => onSwitch(farm.farmId)}
              >
                Switch
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
