"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Modal } from "@/components/ui/modal";
import { Field, Textarea } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import type { AccountDeletionStatus } from "@/lib/types/database";
import { requestAccountDeletionAction } from "./actions";
import { safeAction } from "@/lib/client/safe-action";

/**
 * Compliance: request permanent account deletion.
 *
 * A request, not an instant delete -- an admin reviews and actually performs
 * it (app/admin/subscriptions's Account deletion requests panel). Deleting a
 * farm-owning account is irreversible and cascades every farm-scoped record,
 * so this deliberately isn't a one-click self-service action; filing the
 * request itself is not destructive, which is why this needs nothing heavier
 * than a plain confirm modal.
 */
export function DeleteAccountPanel({
  initialStatus,
}: {
  /** This account's most recent request, if any -- null means never requested. */
  initialStatus: AccountDeletionStatus | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);

  function onSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await safeAction(() => requestAccountDeletionAction({ reason }));
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setStatus("PENDING");
      setOpen(false);
      setReason("");
    });
  }

  return (
    <Panel
      title="Danger zone"
      className="border-destructive/40"
    >
      <div className="flex flex-col gap-3">
        {status === "PENDING" ? (
          <StatusNote tone="warn" title="Deletion request pending">
            An admin is reviewing your request. Your account and farm data stay exactly as they
            are until then.
          </StatusNote>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and every farm you own -- production, sales,
              expenses, and all other records. This can&apos;t be undone. Team members on your
              farms will lose access.
            </p>
            <div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Request account deletion
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Request account deletion">
        <div className="flex flex-col gap-4">
          <StatusNote tone="warn">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              An admin reviews every request before anything is deleted -- usually within a few
              days. Your account stays fully usable until it&apos;s approved.
            </span>
          </StatusNote>

          {error && <StatusNote tone="bad">{error}</StatusNote>}

          <Field label="Reason" htmlFor="deletion-reason" hint="Optional, helps us improve.">
            <Textarea
              id="deletion-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" loading={pending} onClick={onSubmit}>
              <Trash2 className="size-4" aria-hidden />
              Submit request
            </Button>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}
