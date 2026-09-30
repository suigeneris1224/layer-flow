import { formatDate } from "@/lib/format";
import { PLANS } from "@/lib/subscriptions/plans";
import { flockSizeLabel } from "@/lib/domain/waitlist";
import { cn } from "@/lib/utils";
import type { WaitlistEntry } from "@/lib/data/waitlist";

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {children}
    </span>
  );
}

const TONE = {
  good: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  muted: "bg-muted text-muted-foreground",
};

function TrialCell({ entry, now }: { entry: WaitlistEntry; now: Date }) {
  if (!entry.trialEndsAt) return <Pill tone={TONE.muted}>No trial</Pill>;
  const ended = new Date(entry.trialEndsAt) <= now;
  return (
    <Pill tone={ended ? TONE.muted : TONE.good}>
      {ended ? "Ended" : "Until"} {formatDate(entry.trialEndsAt)}
    </Pill>
  );
}

/** Read-only list of paid-plan waitlist entries -- see app/admin/waitlist/page.tsx. */
export function WaitlistTable({ rows }: { rows: WaitlistEntry[] }) {
  const now = new Date();
  return (
    <div className="scroll-x-flush">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Farm</th>
            <th className="px-4 py-2 font-medium">Contact</th>
            <th className="px-4 py-2 font-medium">Flock size</th>
            <th className="px-4 py-2 font-medium">Plan</th>
            <th className="px-4 py-2 font-medium">Trial</th>
            <th className="px-4 py-2 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ownerId} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium">{row.farmName}</td>
              <td className="px-4 py-3">
                <div>{row.mobileNumber}</div>
                <div className="text-xs text-muted-foreground">{row.ownerEmail ?? "—"}</div>
              </td>
              <td className="px-4 py-3">{flockSizeLabel(row.flockSize)}</td>
              <td className="px-4 py-3">{PLANS[row.planWanted].name}</td>
              <td className="px-4 py-3">
                <TrialCell entry={row} now={now} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(row.joinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
