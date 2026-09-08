import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A native checkbox plus its label, as one tappable row.
 *
 * Native, not a custom-drawn box: it comes with keyboard and screen-reader
 * behaviour for free, and `accent-primary` themes it to the same token every
 * other control uses. The row itself -- not just the box -- is the touch
 * target, per the 44px rule the rest of the form controls follow.
 */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; align?: "center" | "start" }
>(({ className, label, id, align = "center", ...props }, ref) => (
  <label
    htmlFor={id}
    className={cn(
      "flex min-h-11 w-fit cursor-pointer gap-2 py-2 text-sm",
      align === "start" ? "items-start" : "items-center"
    )}
  >
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className={cn("size-4 shrink-0 accent-primary", align === "start" && "mt-0.5", className)}
      {...props}
    />
    {label}
  </label>
));
Checkbox.displayName = "Checkbox";
