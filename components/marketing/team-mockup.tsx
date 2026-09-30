const MEMBERS = [
  { initials: "MS", name: "Marlon", role: "Owner" },
  { initials: "AR", name: "Ana", role: "Manager" },
  { initials: "JD", name: "Jun", role: "Worker" },
];

/**
 * The team member list with role badges. A coded recreation, not a
 * screenshot -- see dashboard-mockup.tsx for why.
 */
export function TeamMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {MEMBERS.map((member) => (
          <li key={member.name} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
            >
              {member.initials}
            </span>
            <span className="flex-1 text-xs font-medium sm:text-sm">{member.name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">
              {member.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
