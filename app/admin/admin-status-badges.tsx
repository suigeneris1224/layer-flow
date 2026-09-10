import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top-bar status badges, shared by every admin page (rendered in
 * app/admin/layout.tsx). "System Operational" is a static indicator, not a
 * live health check -- real infra monitoring is out of scope here; it's
 * decorative reassurance, not a claim this page verified anything.
 */
export function AdminStatusBadges({
  betaEnabled,
  activeBetaUsers,
}: {
  betaEnabled: boolean;
  activeBetaUsers: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {betaEnabled && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
            "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]"
          )}
        >
          <FlaskConical className="size-3.5" aria-hidden />
          Beta active
        </span>
      )}

      <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
        {activeBetaUsers} beta {activeBetaUsers === 1 ? "user" : "users"}
      </span>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
        <span
          className="size-1.5 rounded-full bg-[hsl(var(--status-good))]"
          aria-hidden
        />
        Operational
      </span>
    </div>
  );
}
