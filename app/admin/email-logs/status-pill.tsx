import { cn } from "@/lib/utils";
import type { ChipTint } from "@/components/ui/icon-chip";

/**
 * Brevo's own event vocabulary, mapped onto this app's five-tint chip system
 * (docs/design-system.md) rather than a fresh palette: green for delivered
 * (the brief's "emerald"), teal for opened/clicked (the closest cool tone to
 * "blue" among the five), rose for anything that failed to arrive. There is
 * no neutral/grey tint in that set, so "sent" and anything unrecognized fall
 * back to the ordinary muted pill already used for the free-tier plan badge.
 */
const EVENT_TINT: Record<string, ChipTint> = {
  delivered: "green",
  opened: "teal",
  click: "teal",
  hard_bounce: "rose",
  soft_bounce: "rose",
  blocked: "rose",
  spam: "rose",
  error: "rose",
};

const TINT_CLASS: Record<ChipTint, string> = {
  green: "bg-chip-green text-chip-green-fg",
  amber: "bg-chip-amber text-chip-amber-fg",
  teal: "bg-chip-teal text-chip-teal-fg",
  rose: "bg-chip-rose text-chip-rose-fg",
  violet: "bg-chip-violet text-chip-violet-fg",
};

const NEUTRAL_CLASS = "bg-muted text-muted-foreground";

export function EventStatusPill({ event }: { event: string }) {
  const tint = EVENT_TINT[event];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        tint ? TINT_CLASS[tint] : NEUTRAL_CLASS
      )}
    >
      {event.replace(/_/g, " ")}
    </span>
  );
}

/** For the existing "sent" audit trail, which only ever has one state. */
export function SentStatusPill() {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", NEUTRAL_CLASS)}>
      Sent
    </span>
  );
}
