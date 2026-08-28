import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types/database";

/**
 * Whether a sale has been settled.
 *
 * Colour is never the only signal -- the word is always there too, because
 * this is read on a phone in direct sunlight and by colour-blind farmers.
 */
const BADGE_STYLES: Record<PaymentStatus, string> = {
  PAID: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]",
  PARTIAL: "bg-[hsl(var(--status-warn))]/15 text-[hsl(var(--status-warn))]",
  UNPAID: "bg-destructive/10 text-destructive",
};

const BADGE_LABELS: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PARTIAL: "Part paid",
  UNPAID: "Unpaid",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", BADGE_STYLES[status])}
    >
      {BADGE_LABELS[status]}
    </span>
  );
}
