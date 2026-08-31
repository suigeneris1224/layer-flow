import {
  ClipboardList,
  Boxes,
  Egg,
  PhilippinePeso,
  Receipt,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/states";
import type { ActivityEntry } from "@/lib/data/dashboard";

/**
 * What has happened on the farm lately, straight from the audit trail.
 *
 * The wording comes from `describeActivity` in lib/domain/presentation.ts so it
 * is unit-tested and never leaks a raw action string like "sale.recorded".
 */

const LOOKS: Record<string, { icon: LucideIcon; tint: ChipTint }> = {
  "Recorded production": { icon: ClipboardList, tint: "green" },
  "Recorded a sale": { icon: PhilippinePeso, tint: "teal" },
  "Added an expense": { icon: Receipt, tint: "rose" },
  "Adjusted stock": { icon: Boxes, tint: "amber" },
  "Updated a price": { icon: Tags, tint: "violet" },
};

function timeOfDay(iso: string, timezone: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function RecentActivity({
  entries,
  timezone,
}: {
  entries: ActivityEntry[];
  timezone: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Egg}
        title="Nothing yet today"
        message="Your recent records will appear here as you use LayerFlow."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => {
        const look = LOOKS[entry.title] ?? { icon: Egg, tint: "green" as ChipTint };

        return (
          <li key={entry.id} className="flex items-start gap-3">
            <IconChip icon={look.icon} tint={look.tint} size="sm" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.title}</p>
              <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>
            </div>

            <time
              dateTime={entry.at}
              className="shrink-0 text-xs text-muted-foreground tabular"
            >
              {timeOfDay(entry.at, timezone)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
