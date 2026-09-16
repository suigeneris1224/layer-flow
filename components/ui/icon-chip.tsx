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

const SIZES = {
  sm: { box: "size-8", icon: "size-4" },
  md: { box: "size-10", icon: "size-5" },
  lg: { box: "size-11", icon: "size-6" },
} as const;

export function IconChip({
  icon: Icon,
  tint,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tint: ChipTint;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        SIZES[size].box,
        TINTS[tint],
        className
      )}
      aria-hidden
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
}
