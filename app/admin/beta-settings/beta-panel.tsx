"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Save, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { BetaTesterRow } from "@/lib/data/admin";
import {
  addBetaTesterAction,
  removeBetaTesterAction,
  setBetaMaxTestersAction,
  setBetaModeAction,
} from "../actions";

/**
 * Closed-beta toggle, the persisted tester-count cap, and the up-to-cap
 * tester list -- see lib/subscriptions/beta.ts for what the toggle and list
 * actually gate (Pro-tier access on owned farms, and the closed-beta signup
 * block).
 */
export function BetaPanel({
  enabled,
  maxTesters,
  testers,
}: {
  enabled: boolean;
  maxTesters: number;
  testers: BetaTesterRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [maxTestersInput, setMaxTestersInput] = useState(String(maxTesters));

  // This panel never unmounts across router.refresh(), it just receives new
  // props -- so without this, local state would keep showing pre-save values
  // even after the database has moved on.
  const [localEnabled, setLocalEnabled] = useState(enabled);
  useEffect(() => setLocalEnabled(enabled), [enabled]);
  useEffect(() => setMaxTestersInput(String(maxTesters)), [maxTesters]);

  const atCap = testers.length >= maxTesters;
  const maxTestersDirty = maxTestersInput !== String(maxTesters);

  function onToggle() {
    setError(null);
    setPendingAction("toggle");

    startTransition(async () => {
      const result = await setBetaModeAction(!localEnabled);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onSaveMaxTesters() {
    setError(null);
    setPendingAction("maxTesters");

    startTransition(async () => {
      const result = await setBetaMaxTestersAction({ maxTesters: maxTestersInput });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPendingAction("add");

    startTransition(async () => {
      const result = await addBetaTesterAction({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      router.refresh();
    });
  }

  function onRemove(testerEmail: string) {
    setError(null);
    setPendingAction(`remove:${testerEmail}`);

    startTransition(async () => {
      const result = await removeBetaTesterAction(testerEmail);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Panel
      title={
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Beta access limits
          {localEnabled && (
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--status-warn))]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--status-warn))]">
              Beta active
            </span>
          )}
        </h2>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <FlaskConical className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-sm font-medium">
                {localEnabled ? "Beta testing is on" : "Beta testing is off"}
              </p>
              <p className="text-xs text-muted-foreground">
                {localEnabled
                  ? "New public signups are closed. Listed testers below get full Pro access on their own farms."
                  : "Signups are open to everyone. Turn this on to restrict new signups to listed testers only."}
              </p>
            </div>
          </div>
          <Button
            variant={localEnabled ? "outline" : "primary"}
            size="sm"
            loading={pending && pendingAction === "toggle"}
            disabled={pending}
            onClick={onToggle}
          >
            {localEnabled ? "Turn off" : "Turn on"}
          </Button>
        </div>

        {error && <StatusNote tone="bad">{error}</StatusNote>}

        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="w-32">
            <label htmlFor="max-testers" className="text-xs font-medium text-muted-foreground">
              Max testers
            </label>
            <Input
              id="max-testers"
              type="number"
              min={1}
              max={100}
              value={maxTestersInput}
              onChange={(event) => setMaxTestersInput(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={pending && pendingAction === "maxTesters"}
            disabled={pending || !maxTestersDirty}
            onClick={onSaveMaxTesters}
          >
            <Save className="size-4" aria-hidden />
            Save
          </Button>
          <p className="text-xs text-muted-foreground">
            {testers.length} of {maxTesters} testers used
          </p>
        </div>

        {testers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No beta testers added yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {testers.map((tester) => (
              <li
                key={tester.email}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{tester.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDate(tester.addedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={pending && pendingAction === `remove:${tester.email}`}
                  disabled={pending}
                  onClick={() => onRemove(tester.email)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  <span className="sr-only">Remove {tester.email}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onAdd} className={cn("flex flex-wrap items-end gap-2", testers.length > 0 && "border-t border-border pt-4")}>
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="invite-tester" className="text-xs font-medium text-muted-foreground">
              Invite a tester
            </label>
            <Input
              id="invite-tester"
              type="email"
              placeholder="tester@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={atCap}
              required
            />
          </div>
          <Button type="submit" size="sm" loading={pending && pendingAction === "add"} disabled={atCap || pending}>
            <UserPlus className="size-4" aria-hidden />
            Invite
          </Button>
        </form>
        {atCap && (
          <p className="text-xs text-muted-foreground">
            {maxTesters} of {maxTesters} testers added. Remove one, or raise the limit above, to add another.
          </p>
        )}
      </div>
    </Panel>
  );
}
