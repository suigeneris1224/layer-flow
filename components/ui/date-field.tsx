"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { farmToday, formatDate, shiftDate } from "@/lib/format";

/**
 * A date field that is a calendar on a mouse and the OS picker on a phone.
 *
 * Both are rendered; a `pointer:` media query decides which one is displayed,
 * so there is no hydration flash and no user-agent sniffing, and the hidden
 * one is `display:none` and therefore not a second tab stop.
 *
 * Why not one custom calendar everywhere: docs/design-system.md keeps `Select`
 * native because the OS picker beats a custom widget one-handed, outdoors, in
 * gloves. That argument is just as true for dates, and a 7x6 grid of small day
 * cells is the worst possible target on a phone. It is only on a pointer
 * device -- where the native date input is genuinely poor -- that a calendar
 * wins.
 *
 * All arithmetic goes through `shiftDate`, which anchors to UTC midnight. A
 * date built from a local-midnight string lands on the previous day for any
 * timezone ahead of UTC, which is every farm we serve.
 */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/**
 * The box both halves sit in: same border, height and padding either way, so
 * the field does not change shape between a phone and a desk.
 *
 * Deliberately no `display` -- the two halves need different ones. The button
 * is a flex row (label, then icon). The input must NOT be: `display:flex` on a
 * replaced form control is meaningless, and where an engine honours it rather
 * than ignoring it the way Blink does, it lays the value out as a flex item
 * that spills over the field's own border.
 */
const CONTROL = cn(
  "min-h-11 w-full rounded-md border border-input bg-surface shadow-sm",
  "px-3 py-2 text-base md:text-sm",
  "transition-colors hover:border-foreground/30",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
  "aria-[invalid=true]:border-destructive"
);

/** Day of week for a YYYY-MM-DD string, 0 = Sunday, without timezone drift. */
function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function firstOfMonth(month: string): string {
  return `${month}-01`;
}

/** Shift a YYYY-MM month string by whole months. */
function shiftMonth(month: string, months: number): string {
  const [year, mon] = month.split("-").map(Number);
  const index = year * 12 + (mon - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The 42 cells of a month grid, starting on the Sunday before the 1st. */
function monthGrid(month: string): string[] {
  const first = firstOfMonth(month);
  const start = shiftDate(first, -weekdayOf(first));
  return Array.from({ length: 42 }, (_, index) => shiftDate(start, index));
}

function outOfRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}

export interface DateFieldProps {
  id?: string;
  /**
   * Submits with the form. It lives on the native input, which is only ever
   * `display:none` and never `disabled`, so it posts on a pointer device too.
   */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  /** Inclusive bounds, YYYY-MM-DD. */
  min?: string;
  max?: string;
  /** The farm's today, not the browser's. Defaults to the farm timezone. */
  today?: string;
  timezone?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

export function DateField({
  id,
  name,
  value,
  onChange,
  min,
  max,
  today,
  timezone = "Asia/Manila",
  disabled,
  invalid,
  className,
}: DateFieldProps) {
  const now = today ?? farmToday(timezone);
  const yesterday = shiftDate(now, -1);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/*
        Coarse pointer: the OS picker. Kept as a plain native input on purpose.
      */}
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL, "block", "[@media(pointer:fine)]:hidden")}
      />

      <CalendarField
        id={id}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        today={now}
        timezone={timezone}
        disabled={disabled}
        invalid={invalid}
      />

      <QuickDates
        value={value}
        onChange={onChange}
        today={now}
        yesterday={yesterday}
        min={min}
        max={max}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * The two dates that cover almost every entry on this product.
 *
 * A farmer logging yesterday's collection should not have to open a calendar
 * and find the day; that is two taps here.
 */
function QuickDates({
  value,
  onChange,
  today,
  yesterday,
  min,
  max,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  today: string;
  yesterday: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}) {
  const options = [
    { label: "Today", date: today },
    { label: "Yesterday", date: yesterday },
  ].filter((option) => !outOfRange(option.date, min, max));

  if (options.length === 0) return null;

  /*
   * The chips share one row rather than wrapping. A date field is often in a
   * half-width column, where two auto-sized chips wrap and stack into 96px of
   * dead vertical space -- so they split the space instead, capped so they do
   * not stretch across a full-width form. Height stays 44px for the target.
   */
  return (
    <div className="flex gap-2">
      {options.map((option) => {
        const selected = value === option.date;
        return (
          <button
            key={option.label}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.date)}
            className={cn(
              "min-h-11 flex-1 rounded-md border px-2 text-xs transition-colors",
              "max-w-[8rem] md:min-h-0 md:py-1.5",
              selected
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "border-input bg-surface hover:border-foreground/30 hover:bg-muted",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The pointer-device half: a trigger button and a month-grid popover. */
function CalendarField({
  id,
  value,
  onChange,
  min,
  max,
  today,
  timezone,
  disabled,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  today: string;
  timezone: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => monthOf(value || today));
  const [focused, setFocused] = React.useState(value || today);

  const wrapper = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const grid = React.useRef<HTMLDivElement>(null);

  // Reopening should land on the selected date, not wherever it was left.
  React.useEffect(() => {
    if (!open) return;
    const start = value || today;
    setMonth(monthOf(start));
    setFocused(start);
  }, [open, value, today]);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Move real DOM focus with the roving day, so screen readers follow along.
  React.useEffect(() => {
    if (!open) return;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)
      ?.focus();
  }, [open, focused]);

  function move(days: number) {
    const next = shiftDate(focused, days);
    if (outOfRange(next, min, max)) return;
    setFocused(next);
    setMonth(monthOf(next));
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (event.key in keys) {
      event.preventDefault();
      move(keys[event.key]);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const offset = weekdayOf(focused);
      move(event.key === "Home" ? -offset : 6 - offset);
      return;
    }

    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const next = `${shiftMonth(monthOf(focused), event.key === "PageUp" ? -1 : 1)}-${focused.slice(8)}`;
      if (!outOfRange(next, min, max)) {
        setFocused(next);
        setMonth(monthOf(next));
      }
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(focused);
    }
  }

  function select(iso: string) {
    if (outOfRange(iso, min, max)) return;
    onChange(iso);
    setOpen(false);
    trigger.current?.focus();
  }

  const days = monthGrid(month);
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  // A month is reachable if any of its days fall inside the range.
  const canGoBack = !max || `${prevMonth}-01` <= max;
  const canGoForward = !min || `${nextMonth}-31` >= min;

  return (
    <div ref={wrapper} className="relative hidden [@media(pointer:fine)]:block">
      <button
        ref={trigger}
        type="button"
        id={id ? `${id}-trigger` : undefined}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          CONTROL,
          "flex items-center justify-between gap-2 text-left",
          invalid && "border-destructive"
        )}
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {value ? formatDate(value, timezone) : "Choose a date"}
        </span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 top-full z-40 mt-1 w-[17.5rem] rounded-lg border border-border bg-surface p-3 shadow-pop"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!canGoBack}
              aria-label="Previous month"
              onClick={() => setMonth(prevMonth)}
              className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>

            <span aria-live="polite" className="text-sm font-semibold">
              {monthLabel(month)}
            </span>

            <button
              type="button"
              disabled={!canGoForward}
              aria-label="Next month"
              onClick={() => setMonth(nextMonth)}
              className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5" aria-hidden>
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground"
              >
                {day}
              </span>
            ))}
          </div>

          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={grid}
            role="grid"
            onKeyDown={onGridKeyDown}
            className="grid grid-cols-7 gap-0.5"
          >
            {weeks.map((week) => (
              <div key={week[0]} role="row" className="contents">
                {week.map((day) => {
                  const inMonth = monthOf(day) === month;
                  const disabledDay = outOfRange(day, min, max);
                  const selected = day === value;
                  const isToday = day === today;

                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      data-day={day}
                      disabled={disabledDay}
                      tabIndex={day === focused ? 0 : -1}
                      aria-selected={selected}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => select(day)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-md text-sm tabular transition-colors",
                        !inMonth && "text-muted-foreground/50",
                        !selected && !disabledDay && "hover:bg-muted",
                        selected && "bg-primary font-semibold text-primary-foreground",
                        isToday && !selected && "font-semibold text-primary",
                        disabledDay && "cursor-not-allowed opacity-30"
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
