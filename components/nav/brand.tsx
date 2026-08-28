import { Egg } from "lucide-react";

/** Wordmark plus tagline, used at the top of the sidebar and the drawer. */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Egg className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold tracking-tight">LayerFlow</span>
        <span className="text-[11px] text-muted-foreground">Smart Poultry Management</span>
      </span>
    </div>
  );
}
