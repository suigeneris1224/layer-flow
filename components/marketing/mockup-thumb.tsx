import { cn } from "@/lib/utils";

/**
 * A product mockup shrunk into a fixed thumbnail window, for the feature
 * list and how-it-works timeline -- a glimpse of the screen, not the whole
 * thing. The mockup is laid out at a wider virtual width, then scaled down,
 * so it keeps its desktop proportions instead of reflowing into a phone
 * layout. Decorative: the row beside it already says what it shows.
 */
export function MockupThumb({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative h-40 w-full overflow-hidden rounded-xl border border-border bg-section",
        className
      )}
      aria-hidden
      inert
    >
      <div className="pointer-events-none absolute left-4 top-4 w-[166%] origin-top-left scale-[0.6]">
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-section to-transparent" />
    </div>
  );
}
