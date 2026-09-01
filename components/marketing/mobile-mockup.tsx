import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A phone-frame outline, reused by every mobile-UI showcase on the landing page. */
export function MobileMockup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[280px] rounded-[2rem] border-[6px] border-foreground/90 bg-surface p-1.5 shadow-card",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-background">
        <div className="absolute left-1/2 top-1.5 h-1.5 w-16 -translate-x-1/2 rounded-full bg-foreground/90" />
        <div className="px-3 pb-4 pt-6">{children}</div>
      </div>
    </div>
  );
}
