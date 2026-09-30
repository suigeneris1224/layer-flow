import { Check, Egg, Home, Warehouse } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";

const STEPS = [
  { icon: Home, tint: "green" as const, label: "Farm", done: true },
  { icon: Warehouse, tint: "amber" as const, label: "House", done: true },
  { icon: Egg, tint: "teal" as const, label: "Flock", done: false },
];

/**
 * The onboarding wizard's shape: a short, ordered stepper. A coded
 * recreation, not a screenshot -- see dashboard-mockup.tsx for why.
 */
export function OnboardingMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>

      <div className="flex items-center justify-center gap-2 p-6 sm:gap-4 sm:p-8">
        {STEPS.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <span className="relative">
                <IconChip icon={step.icon} tint={step.tint} />
                {step.done && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-good text-white">
                    <Check className="size-2.5" aria-hidden />
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span className="mb-4 h-px w-6 bg-border sm:w-10" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
