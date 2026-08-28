import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The boxed region every screen is built from.
 *
 * Nothing hand-rolls `rounded-lg border bg-surface`: one implementation means
 * one radius, one border, one shadow and one header rhythm across the product.
 */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  /** Right-aligned control in the header -- "View all", a period picker. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-border bg-surface shadow-card",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-4">
          {typeof title === "string" ? (
            <h2 className="text-sm font-semibold">{title}</h2>
          ) : (
            title
          )}
          {action}
        </header>
      )}
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
