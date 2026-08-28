import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The wrapper every signed-in page uses.
 *
 * Exists so pages cannot each invent their own width: before this, the
 * dashboard was max-w-[1600px], inventory max-w-3xl and production max-w-lg,
 * which read as three different apps on a wide screen.
 *
 * `width="reading"` narrows the column for data entry -- a form stretched to
 * 1600px is miserable to fill in -- while keeping the same outer padding.
 */
export function PageShell({
  children,
  width = "full",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  width?: "full" | "reading";
}) {
  return (
    <div
      {...props}
      className={cn(
        "mx-auto flex w-full flex-col gap-4 p-4 lg:gap-5 lg:p-6",
        width === "full" ? "max-w-[1600px]" : "max-w-3xl",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Page title, supporting line, and an optional action on the right. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
