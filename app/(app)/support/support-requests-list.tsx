"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, Send } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MySupportRequestRow } from "@/lib/data/support";
import { replyToSupportRequestAction } from "./actions";

/** Same tone-chip technique as components/notifications/notification-row.tsx's NOTIFICATION_TONE. */
const STATUS_TONE: Record<string, { label: string; chip: string }> = {
  open: { label: "Waiting", chip: "bg-[hsl(var(--status-warn))]/20 text-[hsl(var(--status-warn))]" },
  resolved: { label: "Resolved", chip: "bg-[hsl(var(--status-good))]/20 text-[hsl(var(--status-good))]" },
};

/** One request's thread plus a reply box, opened on demand so the list stays scannable. */
function RequestThread({ request, timezone }: { request: MySupportRequestRow; timezone: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onReply(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await replyToSupportRequestAction(request.id, { body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {request.messages.length > 0 && (
        <ul className="flex flex-col gap-2 border-l-2 border-border pl-3">
          {request.messages.map((msg) => (
            <li key={msg.id} className="text-sm">
              <p className="text-xs font-medium text-muted-foreground">
                {msg.isSelf ? "You" : msg.senderRole === "admin" ? "LayerFlow team" : "Teammate"} ·{" "}
                {formatRelativeDay(msg.createdAt.slice(0, 10), timezone)}
              </p>
              <p className="whitespace-pre-wrap">{msg.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onReply} className="flex flex-col gap-2">
        {error && <StatusNote tone="bad">{error}</StatusNote>}
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Reply…"
          rows={2}
          required
        />
        <Button type="submit" variant="outline" size="sm" loading={pending} className="w-fit">
          <Send className="size-4" aria-hidden />
          Reply
        </Button>
      </form>
    </div>
  );
}

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
                  {request.messages.length > 0 && (
                    <span>
                      · {request.messages.length} repl{request.messages.length === 1 ? "y" : "ies"}
                    </span>
                  )}
                </div>

                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-medium text-primary marker:content-none">
                    View conversation
                  </summary>
                  <RequestThread request={request} timezone={timezone} />
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
