import type { Route } from "next";
import Link from "next/link";
import { Syringe } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button";
import type { FlockDoses } from "@/lib/data/vaccination-schedule";
import {
  actionableDoses,
  flockAgeDays,
  formatAge,
  type DoseState,
  type DoseStatus,
} from "@/lib/domain/vaccination-schedule";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Colour is never the only signal -- the word is always there (see PaymentBadge). */
const STATE_STYLES: Partial<Record<DoseState, string>> = {
  overdue: "bg-destructive/10 text-destructive",
  due_soon: "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]",
  upcoming: "bg-muted text-muted-foreground",
};

function stateLabel(status: DoseStatus): string {
  const days = Math.abs(status.daysUntilDue);
  const unit = days === 1 ? "day" : "days";
  if (status.state === "overdue") return `${days} ${unit} overdue`;
  if (status.daysUntilDue === 0) return "Due today";
  if (status.state === "due_soon") return `In ${days} ${unit}`;
  return "Upcoming";
}

/**
 * What each active flock has due from the farm's own programme.
 *
 * Shows every overdue and due-soon dose, plus the next upcoming one, so a long
 * programme doesn't bury today's work. "Record" opens the form below already
 * filled in, so the worker holding the syringe never retypes the name.
 */
export function DueDosesPanel({
  byFlock,
  today,
  timezone,
  canRecord,
}: {
  byFlock: FlockDoses[];
  today: string;
  timezone: string;
  canRecord: boolean;
}) {
  const rows = byFlock.map(({ flock, statuses }) => {
    const open = actionableDoses(statuses);
    const pressing = open.filter((status) => status.state !== "upcoming");
    const nextUpcoming = open.find((status) => status.state === "upcoming");
    const done = statuses.filter((status) => status.state === "done").length;
    return {
      flock,
      shown: nextUpcoming ? [...pressing, nextUpcoming] : pressing,
      done,
      total: statuses.filter((status) => status.state !== "skipped").length,
    };
  });

  return (
    <Panel title="Due & upcoming" className="lg:col-span-2">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active flocks.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map(({ flock, shown, done, total }) => (
            <li key={flock.id} className="flex flex-col gap-2 py-3 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-medium">{flock.name}</p>
                <p className="text-xs tabular text-muted-foreground">
                  {formatAge(flockAgeDays(flock, today))} old · {done} of {total} doses recorded
                </p>
              </div>

              {shown.length === 0 ? (
                <p className="text-xs text-muted-foreground">Every dose in the programme is recorded.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {shown.map((status) => (
                    <li
                      key={status.item.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {status.item.vaccineName}
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          · {formatAge(status.item.ageDays)} · {formatDateShort(status.dueDate, timezone)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          STATE_STYLES[status.state]
                        )}
                      >
                        {stateLabel(status)}
                      </span>
                      {canRecord && status.state !== "upcoming" && (
                        <Link
                          href={
                            `/health?tab=vaccinations&dose=${status.item.id}&flock=${flock.id}#record-vaccination` as Route
                          }
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          <Syringe className="size-4" aria-hidden />
                          Record
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
