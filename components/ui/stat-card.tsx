import type { LucideIcon } from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import { Delta } from "@/components/ui/delta";
import { cn } from "@/lib/utils";

/**
 * One headline figure: chip, label, number, sublabel, change.
 *
 * The KPI row is five of these. Everything is tabular so the row does not
 * twitch as figures update.
 */
export function StatCard({
  icon,
  tint,
  label,
  value,
  sublabel,
  delta,
  deltaLabel,
  goodWhenUp = true,
  className,
}: {
  icon: LucideIcon;
  tint: ChipTint;
  label: string;
  value: string;
  sublabel?: string;
  delta?: number | null;
  deltaLabel?: string;
  goodWhenUp?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <IconChip icon={icon} tint={tint} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="stat-figure mt-1.5">{value}</p>
          {sublabel && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </div>

      {delta !== undefined && (
        <Delta value={delta} label={deltaLabel} goodWhenUp={goodWhenUp} />
      )}
    </div>
  );
}
