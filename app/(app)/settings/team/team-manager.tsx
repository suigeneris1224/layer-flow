"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Copy, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { invitableRoles } from "@/lib/validation/schemas";
import type { PendingInvitation, TeamMember } from "@/lib/data/team";
import type { FarmRole } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
} from "./actions";
import { safeAction } from "@/lib/client/safe-action";

/**
 * The whole team screen, client-side because every row has controls.
 *
 * `canManage` is the owner check from the server. It hides what the database
 * would refuse anyway -- the RLS policies are the boundary, this is courtesy.
 */
export function TeamManager({
  members,
  invitations,
  currentUserId,
  canManage,
  canInvite,
  appUrl,
  timezone,
}: {
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId: string;
  canManage: boolean;
  canInvite: boolean;
  appUrl: string;
  timezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof invitableRoles)[number]>("WORKER");

  const inviteUrl = (token: string) => `${appUrl}/invite/${token}`;

  function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await safeAction(() => inviteMemberAction({ email, role }));

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setEmail("");
      // Copy straight away: the link is the whole point of the invitation, and
      // a farmer who has to hunt for it afterwards will send the wrong thing.
      void copy(inviteUrl(result.data.token));
      router.refresh();
    });
  }

  /**
   * Fallback for when the Clipboard API is unavailable or rejects --
   * `navigator.clipboard` doesn't exist at all in a non-secure context and in
   * several in-app browsers (Messenger/Facebook/Instagram), and the
   * auto-copy-on-create call above runs after an `await` inside
   * `startTransition`, outside the original click's synchronous call stack,
   * which some browsers (Safari included) refuse to treat as a user gesture
   * and reject outright. `document.execCommand("copy")` via a temporary,
   * off-screen textarea is the standard cross-browser fallback for both.
   */
  function legacyCopy(url: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  async function copy(url: string) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      if (legacyCopy(url)) {
        setCopied(url);
        window.setTimeout(() => setCopied(null), 2000);
        return;
      }
      // Every copy path failed; the link is still on screen to select by hand.
      setFormError("Couldn't copy automatically — select the link and copy it.");
    }
  }

  function onRoleChange(memberId: string, next: FarmRole) {
    setFormError(null);
    startTransition(async () => {
      const result = await safeAction(() => updateMemberRoleAction({ memberId, role: next }));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onRemove(member: TeamMember) {
    if (
      !window.confirm(
        `Remove ${member.fullName}? They lose access to this farm immediately.`
      )
    ) {
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const result = await safeAction(() => removeMemberAction(member.id));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onRevoke(invitation: PendingInvitation) {
    setFormError(null);
    startTransition(async () => {
      const result = await safeAction(() => revokeInvitationAction(invitation.id));
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {formError && <StatusNote tone="bad">{formError}</StatusNote>}

      <Panel title="People on this farm">
        <ul className="flex flex-col divide-y divide-border">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isOwner = member.role === "OWNER";

            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0"
              >
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                  >
                    {member.fullName.slice(0, 2).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-medium">
                    {member.fullName}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        you
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[member.role]}
                  </p>
                </div>

                {/*
                  The owner's role is fixed and so is your own: a farm must keep
                  an owner, and the person who could demote themselves out of
                  the seat is the one who must not.
                */}
                {canManage && !isOwner && !isSelf ? (
                  <div className="flex items-center gap-2">
                    <Select
                      fit
                      aria-label={`Role for ${member.fullName}`}
                      value={member.role}
                      disabled={pending}
                      onChange={(event) =>
                        onRoleChange(member.id, event.target.value as FarmRole)
                      }
                    >
                      {invitableRoles.map((option) => (
                        <option key={option} value={option}>
                          {ROLE_LABELS[option]}
                        </option>
                      ))}
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={pending}
                      aria-label={`Remove ${member.fullName}`}
                      onClick={() => onRemove(member)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm font-medium">{ROLE_LABELS[member.role]}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      {invitations.length > 0 && (
        <Panel title="Waiting to be accepted">
          <ul className="flex flex-col divide-y divide-border">
            {invitations.map((invitation) => {
              const url = inviteUrl(invitation.token);
              return (
                <li key={invitation.id} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate text-sm font-medium">{invitation.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ROLE_LABELS[invitation.role]} · expires{" "}
                        {formatDate(invitation.expiresAt, timezone)}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void copy(url)}
                        >
                          {copied === url ? (
                            <Check className="size-4" aria-hidden />
                          ) : (
                            <Copy className="size-4" aria-hidden />
                          )}
                          {copied === url ? "Copied" : "Copy link"}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={pending}
                          aria-label={`Cancel invitation for ${invitation.email}`}
                          onClick={() => onRevoke(invitation)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* On screen as well as on the clipboard: some in-app
                      browsers block the clipboard entirely. */}
                  <code className="scroll-x rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                    {url}
                  </code>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {canManage && (
        <Panel title="Invite someone">
          <form onSubmit={onInvite} className="flex flex-col gap-4" noValidate>
            <Field label="Email" htmlFor="invite-email" error={fieldErrors.email}>
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={!!fieldErrors.email}
              />
            </Field>

            <Field
              label="Role"
              htmlFor="invite-role"
              hint={ROLE_DESCRIPTIONS[role]}
              error={fieldErrors.role}
            >
              <Select
                id="invite-role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as (typeof invitableRoles)[number])
                }
              >
                {invitableRoles.map((option) => (
                  <option key={option} value={option}>
                    {ROLE_LABELS[option]}
                  </option>
                ))}
              </Select>
            </Field>

            <div>
              <Button
                type="submit"
                loading={pending}
                disabled={!email.trim() || !canInvite}
              >
                <UserPlus className="size-4" aria-hidden />
                {pending ? "Creating…" : "Create invite link"}
              </Button>
            </div>

            <p className={cn("text-xs text-muted-foreground")}>
              You&apos;ll get a link to send them however you like — Messenger, SMS, or
              in person. They join once they open it and sign in.
            </p>
          </form>
        </Panel>
      )}
    </div>
  );
}
