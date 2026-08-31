import type { Metadata, Route } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getInvitationPreview } from "@/lib/data/team";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AcceptInvitation } from "./accept-invitation";

export const metadata: Metadata = { title: "Farm invitation" };

export const dynamic = "force-dynamic";

/**
 * The page an invitation link opens.
 *
 * Public — it has to be, or somebody with no account cannot see what they are
 * being asked to join before signing up. It shows only farm name, role and
 * expiry, all from `invitation_preview`, which is deliberately narrow: anyone
 * holding the token reaches this, so it must not leak the invitee's email, who
 * sent it, or anything else about the farm.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [lookup, user] = await Promise.all([
    getInvitationPreview(token),
    getSessionUser(),
  ]);

  if (lookup.status === "unavailable") {
    // We could not check, which is not the same as "your link is bad". Saying
    // the latter would send them back for a replacement that fails identically.
    return (
      <Panel title="Invitation">
        <StatusNote tone="bad" title="We couldn't check this invitation">
          Something went wrong on our side, not with your link. Please try again in a
          moment.
        </StatusNote>
      </Panel>
    );
  }

  if (lookup.status === "invalid") {
    return (
      <Panel title="Invitation">
        {/*
          One message for missing, expired and already-used alike. Telling them
          apart would turn this page into a way to test whether a token is live.
        */}
        <StatusNote tone="warn" title="This invitation isn't valid">
          It may have expired or already been used. Ask the farm owner to send you a
          new link.
        </StatusNote>
      </Panel>
    );
  }

  const preview = lookup.preview;
  const nextPath = `/invite/${token}`;

  return (
    <Panel title="You've been invited">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-lg font-semibold tracking-tight">{preview.farmName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            as a {ROLE_LABELS[preview.role].toLowerCase()} —{" "}
            {ROLE_DESCRIPTIONS[preview.role].toLowerCase()}
          </p>
        </div>

        {user ? (
          <AcceptInvitation token={token} farmName={preview.farmName} />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to join.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/signup?next=${encodeURIComponent(nextPath)}` as Route}
                className={cn(buttonVariants({ size: "md" }))}
              >
                <UserPlus className="size-4" aria-hidden />
                Create an account
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}` as Route}
                className={cn(buttonVariants({ variant: "outline", size: "md" }))}
              >
                I already have one
              </Link>
            </div>
          </div>
        )}

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          This link works until {formatDate(preview.expiresAt)}.
        </p>
      </div>
    </Panel>
  );
}
