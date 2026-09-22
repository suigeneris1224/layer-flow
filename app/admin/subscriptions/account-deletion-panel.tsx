"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { formatRelativeDay } from "@/lib/format";
import type { PendingAccountDeletionRequestRow } from "@/lib/data/account-deletion";
import {
  adminApproveAccountDeletionAction,
  adminRejectAccountDeletionAction,
} from "../actions";
import { safeAction } from "@/lib/client/safe-action";

/** Pending account deletion requests awaiting review -- see app/admin/actions.ts. */
export function AccountDeletionPanel({
  requests,
}: {
  requests: PendingAccountDeletionRequestRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onApprove(request: PendingAccountDeletionRequestRow) {
    setError(null);
    const impact =
      request.farmNames.length > 0
        ? `permanently delete ${request.farmNames.join(", ")} and every record on ${
            request.farmNames.length === 1 ? "it" : "them"
          }${request.otherMemberCount > 0 ? `, removing access for ${request.otherMemberCount} other team member${request.otherMemberCount === 1 ? "" : "s"}` : ""}`
        : "delete this account (it owns no farms)";
    const confirmed = window.confirm(
      `Approve deleting ${request.email}'s account? This will ${impact}. This cannot be undone.`
    );
    if (!confirmed) return;

    setActingId(request.id);
    startTransition(async () => {
      const result = await safeAction(() => adminApproveAccountDeletionAction(request.id));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onReject(request: PendingAccountDeletionRequestRow) {
    setError(null);
    const reason = window.prompt("Reason for rejecting this request (optional):") ?? "";
    const confirmed = window.confirm(`Reject ${request.email}'s deletion request?`);
    if (!confirmed) return;

    setActingId(request.id);
    startTransition(async () => {
      const result = await safeAction(() =>
        adminRejectAccountDeletionAction(request.id, { reason })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (requests.length === 0) return null;

  return (
    <Panel title="Account deletion requests">
      <div className="flex flex-col gap-3">
        {error && <StatusNote tone="bad">{error}</StatusNote>}

        <ul className="flex flex-col divide-y divide-border">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-3 py-3 first:pt-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{request.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatRelativeDay(request.createdAt.slice(0, 10))}
                  </p>
                  {request.reason && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      &ldquo;{request.reason}&rdquo;
                    </p>
                  )}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-bad">
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                    {request.farmNames.length > 0
                      ? `Owns ${request.farmNames.join(", ")}${
                          request.otherMemberCount > 0
                            ? ` -- ${request.otherMemberCount} other team member${
                                request.otherMemberCount === 1 ? "" : "s"
                              } would lose access`
                            : ""
                        }`
                      : "Owns no farms"}
                  </p>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    loading={pending && actingId === request.id}
                    disabled={pending}
                    onClick={() => onReject(request)}
                  >
                    <XCircle className="size-4" aria-hidden />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    loading={pending && actingId === request.id}
                    disabled={pending}
                    onClick={() => onApprove(request)}
                  >
                    <CheckCircle2 className="size-4" aria-hidden />
                    Approve &amp; delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
