import type { Metadata, Route } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardList, TriangleAlert } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canRecordProduction } from "@/lib/auth/permissions";
import { historyCutoffDate, limitReachedPrompt } from "@/lib/subscriptions/entitlements";
import {
  countProductionBefore,
  getProductionCount,
  getProductionHistory,
} from "@/lib/data/production";
import { getFlocks } from "@/lib/data/flocks";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { buttonVariants } from "@/components/ui/button";
import { formatNumber, formatPercent, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Production" };

export const dynamic = "force-dynamic";

const DAYS_PER_PAGE = 15;

/** ISO date, for comparing against the `production_date` column. */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; flock?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  const { page: pageParam, flock: flockParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // The FREE plan sees `history_days` worth of records. This is the first
  // screen where that limit means anything, so it is the first caller of
  // historyCutoffDate -- everywhere else, history is inherently bounded.
  const cutoff = historyCutoffDate(entitlement);
  const since = cutoff ? isoDay(cutoff) : null;

  const flocks = await getFlocks(context.farmId);
  const flockId = flocks.some((f) => f.id === flockParam) ? flockParam : undefined;

  const [days, daysCount, hiddenCount] = await Promise.all([
    getProductionHistory(context.farmId, {
      limit: DAYS_PER_PAGE,
      offset: (page - 1) * DAYS_PER_PAGE,
      flockId,
      since,
    }),
    getProductionCount(context.farmId, { flockId, since }),
    // Only tell a farmer records are hidden when some actually are.
    since ? countProductionBefore(context.farmId, since, flockId) : Promise.resolve(0),
  ]);

  const totalPages = Math.max(1, Math.ceil(daysCount / DAYS_PER_PAGE));
  const canRecord = canRecordProduction(context);
  const query = (next: number) =>
    `/production?page=${next}${flockId ? `&flock=${flockId}` : ""}` as Route;

  return (
    <PageShell>
      <PageHeader
        title="Production"
        description="Every day you have recorded, newest first."
        action={
          canRecord && (
            <Link href="/production/new" className={cn(buttonVariants({ size: "md" }))}>
              <ClipboardList className="size-4" aria-hidden />
              Record production
            </Link>
          )
        }
      />

      {flocks.length > 1 && (
        <nav aria-label="Filter by flock" className="flex flex-wrap gap-2">
          <Link
            href="/production"
            aria-current={!flockId ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: !flockId ? "primary" : "outline", size: "sm" })
            )}
          >
            All flocks
          </Link>
          {flocks.map((flock) => (
            <Link
              key={flock.id}
              href={`/production?flock=${flock.id}` as Route}
              aria-current={flockId === flock.id ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: flockId === flock.id ? "primary" : "outline",
                  size: "sm",
                })
              )}
            >
              {flock.name}
            </Link>
          ))}
        </nav>
      )}

      {daysCount === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing recorded yet"
          message="Record a day of collection to start building your history."
          actionLabel={canRecord ? "Record production" : undefined}
          actionHref={canRecord ? "/production/new" : undefined}
        />
      ) : (
        <Panel title="Recorded days">
          <ul className="flex flex-col divide-y divide-border">
            {days.map((day) => (
              <li key={day.id} className="py-3 first:pt-0">
                <Link
                  href={`/production/${day.id}`}
                  className="flex flex-col gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {formatRelativeDay(day.productionDate, context.timezone)}
                      {flocks.length > 1 && ` · ${day.flockName}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatNumber(day.hensPresent)} hens
                      {day.mortality > 0 && ` · ${formatNumber(day.mortality)} lost`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    {day.ungradedEggs > 0 && (
                      <span
                        className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--status-warn))]"
                        title={`${formatNumber(day.ungradedEggs)} eggs not sorted by size yet`}
                      >
                        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                        {formatNumber(day.ungradedEggs)} unsorted
                      </span>
                    )}
                    <span className="text-right text-sm font-semibold tabular">
                      {formatNumber(day.eggsCollected)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        eggs
                      </span>
                    </span>
                    <span className="w-14 text-right text-sm tabular text-muted-foreground">
                      {formatPercent(day.layingRate)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-muted-foreground sm:order-2 sm:text-left">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2 sm:order-1">
                <Link
                  href={page > 1 ? query(page - 1) : ("/production" as Route)}
                  aria-disabled={page <= 1}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "flex-1 justify-center sm:flex-none",
                    page <= 1 && "pointer-events-none opacity-50"
                  )}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Previous
                </Link>

                <Link
                  href={query(page + 1)}
                  aria-disabled={page >= totalPages}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "flex-1 justify-center sm:flex-none",
                    page >= totalPages && "pointer-events-none opacity-50"
                  )}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </Panel>
      )}

      {hiddenCount > 0 && (
        <UpgradePanel
          prompt={limitReachedPrompt(entitlement, "history_days", hiddenCount)}
        />
      )}
    </PageShell>
  );
}
