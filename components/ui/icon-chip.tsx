import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The tinted rounded square behind a stat icon.
 *
 * Exactly five tints exist. A screen needing a sixth is a screen doing too
 * much -- see docs/design-system.md.
 */
export type ChipTint = "green" | "amber" | "teal" | "rose" | "violet";

const TINTS: Record<ChipTint, string> = {
  green: "bg-chip-green text-chip-green-fg",
  amber: "bg-chip-amber text-chip-amber-fg",
  teal: "bg-chip-teal text-chip-teal-fg",
  rose: "bg-chip-rose text-chip-rose-fg",
  violet: "bg-chip-violet text-chip-violet-fg",
};

export function IconChip({
  icon: Icon,
  tint,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tint: ChipTint;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "md" ? "size-10" : "size-8",
        TINTS[tint],
        className
      )}
      aria-hidden
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}
