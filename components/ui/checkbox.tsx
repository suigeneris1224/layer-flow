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
  React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }
>(({ className, label, id, ...props }, ref) => (
  <label
    htmlFor={id}
    className="flex min-h-11 w-fit cursor-pointer items-center gap-2 py-2 text-sm"
  >
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className={cn("size-4 shrink-0 accent-primary", className)}
      {...props}
    />
    {label}
  </label>
));
Checkbox.displayName = "Checkbox";
