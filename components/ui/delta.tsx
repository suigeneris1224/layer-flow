import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

/**
 * A period-over-period change.
 *
 * The arrow is not decoration: colour alone fails for colour-blind users and
 * in direct sunlight, which is where this app gets used. Direction is always
 * carried by the glyph as well as the hue.
 *
 * `goodWhenUp` exists because a rise is not always good -- expenses going up
 * is bad news, and painting it green would be actively misleading.
 */
export function Delta({
  value,
  label,
  goodWhenUp = true,
  className,
}: {
  /** Percentage change. Null when there is no previous period to compare. */
  value: number | null;
  label?: string;
  goodWhenUp?: boolean;
  className?: string;
}) {
  if (value === null) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Minus className="size-3" aria-hidden />
        <span>No comparison yet</span>
      </span>
    );
  }

  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const positive = flat ? null : up === goodWhenUp;

  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular",
          positive === null && "text-muted-foreground",
          positive === true && "text-good",
          positive === false && "text-bad"
        )}
      >
        <Icon className="size-3" aria-hidden />
        {flat ? "0%" : formatPercent(Math.abs(value))}
      </span>
      {label && <span className="text-muted-foreground">{label}</span>}
      <span className="sr-only">
        {flat ? "no change" : up ? "increase" : "decrease"}
        {label ? ` ${label}` : ""}
      </span>
    </span>
  );
}
