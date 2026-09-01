"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A password `Input` with a show/hide toggle.
 *
 * Not built on `Input`'s `adornment` prop -- that's styled for a leading icon
 * only, and this needs a trailing button. Kept as its own small component
 * (rather than a mode added to `Input`) so `Input` stays a plain, hook-free
 * control usable from a Server Component.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <span className="relative flex w-full items-center">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn(
          "flex min-h-11 w-full rounded-md border border-input bg-surface shadow-sm",
          "px-3 py-2 pr-11 text-base md:text-sm",
          "transition-colors hover:border-foreground/30",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          "aria-[invalid=true]:border-destructive",
          "placeholder:text-muted-foreground",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        // tabIndex left default: a sighted mouse/touch user reaches it by
        // pointer, and it stays in the natural tab order right after the
        // field for keyboard users too.
        className="absolute right-0 flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </span>
  );
});
PasswordInput.displayName = "PasswordInput";
