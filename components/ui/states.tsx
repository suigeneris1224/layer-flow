import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

/*
 * Loading / error / empty / success. Every screen owes the farmer all four --
 * a blank panel with no explanation is the most common way software wastes
 * someone's morning.
 */

export type StatusTone = "good" | "warn" | "bad" | "info";

const TONE_STYLES: Record<StatusTone, string> = {
  good: "border-[hsl(var(--status-good))]/30 bg-[hsl(var(--status-good))]/10 text-[hsl(var(--status-good))]",
  warn: "border-[hsl(var(--status-warn))]/30 bg-[hsl(var(--status-warn))]/10 text-[hsl(var(--status-warn))]",
  bad: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-border bg-muted text-muted-foreground",
};

const TONE_ICONS: Record<StatusTone, React.ComponentType<{ className?: string }>> = {
  good: CheckCircle2,
  warn: TriangleAlert,
  bad: AlertCircle,
  info: Info,
};

/**
 * A status message. Always pairs colour with an icon and words -- colour alone
 * fails for colour-blind users and in direct sunlight.
 */
export function StatusNote({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: StatusTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = TONE_ICONS[tone];
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border p-3 text-sm",
        TONE_STYLES[tone],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertCircle className="size-8 text-destructive" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: Route;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-1")}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/** Shimmer placeholder sized to the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}

export function LoadingTiles({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
