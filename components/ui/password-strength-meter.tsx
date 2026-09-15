"use client";

import { passwordStrength } from "@/lib/domain/password";
import { cn } from "@/lib/utils";

const SEGMENT_COLOR = [
  "bg-destructive",
  "bg-[hsl(var(--status-warn))]",
  "bg-primary",
  "bg-[hsl(var(--status-good))]",
] as const;

const LABEL_COLOR = [
  "text-destructive",
  "text-[hsl(var(--status-warn))]",
  "text-primary",
  "text-[hsl(var(--status-good))]",
] as const;

/**
 * A live 4-segment strength bar under a password field. Renders nothing for
 * an empty field -- no judgment before the farmer has typed anything.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label } = passwordStrength(password);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1" role="presentation">
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              segment <= score ? SEGMENT_COLOR[score] : "bg-muted"
            )}
            aria-hidden
          />
        ))}
      </div>
      <p className={cn("text-xs font-medium", LABEL_COLOR[score])}>{label}</p>
    </div>
  );
}
