"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { formatRelativeDay } from "@/lib/format";
import type { SupportRequestRow } from "@/lib/data/admin";
import { resolveSupportRequestAction } from "./actions";

/** Open support requests, priority (Pro/beta-Pro) first, plus a collapsed resolved history -- see lib/data/support usage in app/(app)/support/actions.ts. */
export function SupportPanel({ requests }: { requests: SupportRequestRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = requests.filter((request) => request.status === "open");
  const resolved = requests.filter((request) => request.status !== "open");

  function onResolve(id: string) {
    setError(null);
    setResolvingId(id);

    startTransition(async () => {
      const result = await resolveSupportRequestAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Panel title="Support requests">
      <div className="flex flex-col gap-3">
        {error && <StatusNote tone="bad">{error}</StatusNote>}

        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open requests.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {open.map((request) => (
              <li key={request.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {request.priority && (
                      <LifeBuoy className="size-3.5 shrink-0 text-primary" aria-hidden />
                    )}
                    {request.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {request.farmName} · {request.submitterEmail ?? "Unknown"} ·{" "}
                    {formatRelativeDay(request.createdAt.slice(0, 10))}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">{request.message}</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={pending && resolvingId === request.id}
                  disabled={pending}
                  onClick={() => onResolve(request.id)}
                  className="shrink-0"
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  Resolve
                </Button>
              </li>
            ))}
          </ul>
        )}

        {resolved.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground marker:content-none">
              Resolved ({resolved.length})
            </summary>
            <ul className="mt-2 flex flex-col divide-y divide-border">
              {resolved.map((request) => (
                <li key={request.id} className="py-3 first:pt-0">
                  <p className="text-sm font-medium text-muted-foreground">{request.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.farmName} · {request.submitterEmail ?? "Unknown"} ·{" "}
                    {formatRelativeDay(request.createdAt.slice(0, 10))}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Panel>
  );
}
