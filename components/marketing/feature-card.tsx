import type { LucideIcon } from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";

/** One capability, in the landing page's feature grid. */
export function FeatureCard({
  icon,
  tint,
  title,
  copy,
}: {
  icon: LucideIcon;
  tint: ChipTint;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <IconChip icon={icon} tint={tint} />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
      </div>
    </div>
  );
}
