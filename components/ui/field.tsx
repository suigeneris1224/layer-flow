import * as React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Form controls.
 *
 * Two sizing rules that look like details and are not:
 *
 *   text-base md:text-sm — 16px on mobile because iOS zooms the whole page
 *   when a focused input is smaller than that, which is jarring mid-entry.
 *   14px from `md`, where 16px reads oversized.
 *
 *   min-h-11 — a 44px target. This app is used one-handed, outdoors, sometimes
 *   in gloves.
 */

/** Shared shell so input, select and textarea cannot drift apart. */
const CONTROL = cn(
  "flex min-h-11 w-full rounded-md border border-input bg-surface shadow-sm",
  "px-3 py-2 text-base md:text-sm",
  "transition-colors hover:border-foreground/30",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
  "aria-[invalid=true]:border-destructive"
);

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { adornment?: React.ReactNode }
>(({ className, adornment, ...props }, ref) => {
  if (!adornment) {
    return (
      <input
        ref={ref}
        className={cn(CONTROL, "placeholder:text-muted-foreground", className)}
        {...props}
      />
    );
  }

  /*
   * A leading adornment -- the currency symbol on a money field, a search
   * icon. It sits inside the control so the whole thing reads as one input,
   * and is aria-hidden because the field label already says what it is.
   */
  return (
    <span className="relative flex w-full items-center">
      <span
        className="pointer-events-none absolute left-3 text-sm text-muted-foreground"
        aria-hidden
      >
        {adornment}
      </span>
      <input
        ref={ref}
        className={cn(CONTROL, "pl-8 placeholder:text-muted-foreground", className)}
        {...props}
      />
    </span>
  );
});
Input.displayName = "Input";

/**
 * Numeric input tuned for fast phone entry: opens the number pad, selects on
 * focus so the farmer overwrites rather than backspaces, and shows tabular
 * figures.
 */
export const NumberInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { adornment?: React.ReactNode }
>(({ className, onFocus, ...props }, ref) => (
  <Input
    ref={ref}
    type="number"
    inputMode="decimal"
    // A scroll wheel over a focused number field silently changes it. Farmers
    // scrolling a long form would corrupt counts without noticing.
    onWheel={(event) => event.currentTarget.blur()}
    onFocus={(event) => {
      event.currentTarget.select();
      onFocus?.(event);
    }}
    className={cn("tabular text-right", className)}
    {...props}
  />
));
NumberInput.displayName = "NumberInput";

/**
 * Native `<select>`, restyled.
 *
 * Deliberately still native: on a phone this opens the OS picker wheel, which
 * beats any custom listbox for one-handed use, and keyboard plus screen-reader
 * behaviour comes free. `appearance-none` removes the dated OS arrow; the
 * chevron below replaces it.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    /**
     * Shrink to the width of the chosen option instead of filling the row.
     *
     * The chevron is positioned against the wrapper, so a caller that narrowed
     * only the `<select>` used to leave it stranded at the far right of a
     * full-width span. Narrowing both together is the supported way to do it.
     */
    fit?: boolean;
  }
>(({ className, children, fit, ...props }, ref) => (
  <span
    className={cn("relative items-center", fit ? "inline-flex w-auto" : "flex w-full")}
  >
    <select
      ref={ref}
      className={cn(
        CONTROL,
        "cursor-pointer appearance-none bg-none pr-10",
        fit && "w-auto",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 size-4 text-muted-foreground"
      aria-hidden
    />
  </span>
));
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(CONTROL, "min-h-20 resize-y placeholder:text-muted-foreground", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium leading-none", className)} {...props} />
  );
}

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + error, wired together for screen readers.
 *
 * The error is `role="alert"` so it is announced when validation fails.
 */
export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}

      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
