import type { LucideIcon } from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import { Delta } from "@/components/ui/delta";
import { InfoTip } from "@/components/ui/info-tip";
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
  info,
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
  /** Definition shown in an "i" popover next to the label, e.g. how a rate is computed. */
  info?: React.ReactNode;
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
      {/*
        The chip sits above the figure on a phone rather than beside it: in a
        2-up grid it was eating 52px of a 123px content box, leaving the
        headline number nowhere to go. Side by side again from `sm`, where
        there is room for both.
      */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <IconChip icon={icon} tint={tint} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <span className="truncate">{label}</span>
            {info && <InfoTip label={`About ${label}`}>{info}</InfoTip>}
          </p>
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
