import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_NAMES = ["Farm", "House", "Flock", "Prices"];

export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <nav aria-label="Setup progress">
      <ol className="flex items-center gap-2">
        {Array.from({ length: total }, (_, index) => {
          const step = index + 1;
          const done = step < current;
          const active = step === current;

          return (
            <li key={step} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  done || active ? "bg-primary" : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {done && <Check className="size-3" aria-hidden />}
                {STEP_NAMES[index]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">
        Step {current} of {total}
      </p>
    </nav>
  );
}
