import { LifeBuoy } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MySupportRequestRow } from "@/lib/data/support";

/** Same tone-chip technique as components/notifications/notification-row.tsx's NOTIFICATION_TONE. */
const STATUS_TONE: Record<string, { label: string; chip: string }> = {
  open: { label: "Waiting", chip: "bg-[hsl(var(--status-warn))]/20 text-[hsl(var(--status-warn))]" },
  resolved: { label: "Resolved", chip: "bg-[hsl(var(--status-good))]/20 text-[hsl(var(--status-good))]" },
};

/** The requests this user has sent, so submitting one isn't a message into the void. */
export function SupportRequestsList({
  requests,
  timezone,
}: {
  requests: MySupportRequestRow[];
  timezone: string;
}) {
  return (
    <Panel title="Your requests">
      {requests.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No requests yet"
          message="Questions about your farm or account? Send one and it'll show up here."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {requests.map((request) => {
            const tone = STATUS_TONE[request.status] ?? STATUS_TONE.open;
            return (
              <li key={request.id} className="flex flex-col gap-1 py-3 first:pt-0">
                <p className="text-sm font-medium">{request.subject}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", tone.chip)}>
                    {tone.label}
                  </span>
                  {formatRelativeDay(request.createdAt.slice(0, 10), timezone)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
