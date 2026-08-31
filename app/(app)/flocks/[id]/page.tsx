import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Egg,
  HeartCrack,
  Syringe,
  Wheat,
} from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { getFlock, getFlockSummary } from "@/lib/data/flocks";
import { getProductionHistory } from "@/lib/data/production";
import {
  getFeedUsage,
  getMortalityRecords,
  getVaccinations,
} from "@/lib/data/health";
import { flockAgeWeeks } from "@/lib/domain/calculations";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { buttonVariants } from "@/components/ui/button";
import {
  formatCurrency,
  formatDate,
  formatKg,
  formatNumber,
  formatPercent,
  formatRelativeDay,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Flock" };

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 5;

const STATUS_LABEL = {
  GROWING: "Growing",
  PRODUCING: "Producing",
  SOLD: "Sold",
  CLOSED: "Closed",
} as const;

/** A small list with a heading and an empty fallback -- used four times below. */
function RecentList({
  title,
  action,
  items,
  empty = "Nothing recorded yet.",
}: {
  title: string;
  action?: React.ReactNode;
  items: { key: string; primary: string; secondary: string; value?: string }[];
  /**
   * The mortality and feed panels list ad-hoc rows only -- the ones a
   * collection day owns live on that day. Saying "nothing recorded" there
   * would contradict the feed total in the stat row above.
   */
  empty?: string;
}) {
  return (
    <Panel title={title} action={action}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.key} className="flex gap-3 py-2 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{item.secondary}</p>
              </div>
              {item.value && (
                <span className="text-right text-sm font-semibold tabular">
                  {item.value}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default async function FlockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireFarmContext();

  const flock = await getFlock(context.farmId, id);
  if (!flock) notFound();

  const [summary, production, mortality, feed, vaccinations] = await Promise.all([
    getFlockSummary(context.farmId, id),
    getProductionHistory(context.farmId, { flockId: id, limit: RECENT_LIMIT }),
    getMortalityRecords(context.farmId, { flockId: id, limit: RECENT_LIMIT }),
    getFeedUsage(context.farmId, { flockId: id, limit: RECENT_LIMIT }),
    getVaccinations(context.farmId, { flockId: id, limit: RECENT_LIMIT }),
  ]);

  const ageWeeks = flockAgeWeeks(flock.placementDate);
  // formatPercent takes 0-100, the same scale layingRate() returns.
  const survival =
    flock.initialHens > 0 ? (flock.currentHens / flock.initialHens) * 100 : 0;

  return (
    <PageShell>
      <PageHeader
        title={flock.name}
        description={`${flock.breed} · ${flock.houseName} · ${STATUS_LABEL[flock.status]}`}
        action={
          <Link
            href={`/production?flock=${flock.id}` as Route}
            className={cn(buttonVariants({ variant: "outline", size: "md" }))}
          >
            <ClipboardList className="size-4" aria-hidden />
            Full history
          </Link>
        }
      />

      <Link
        href="/flocks"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to flocks
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Egg}
          tint="amber"
          label="Hens"
          value={formatNumber(flock.currentHens)}
          sublabel={`of ${formatNumber(flock.initialHens)} placed · ${formatPercent(survival)} remaining`}
        />
        <StatCard
          icon={ClipboardList}
          tint="teal"
          label="Eggs collected"
          value={formatNumber(summary.lifetimeEggs)}
          sublabel={`over ${formatNumber(summary.daysRecorded)} recorded days`}
        />
        <StatCard
          icon={Wheat}
          tint="green"
          label="Feed used"
          value={formatKg(summary.lifetimeFeedKg)}
          sublabel={
            summary.lifetimeFeedCost > 0
              ? formatCurrency(summary.lifetimeFeedCost, context.currency)
              : "No cost recorded"
          }
        />
        <StatCard
          icon={HeartCrack}
          tint="rose"
          label="Birds lost"
          value={formatNumber(summary.lifetimeMortality)}
          sublabel={`${ageWeeks} weeks old`}
          goodWhenUp={false}
        />
      </div>

      <Panel title="Flock details">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Placed</dt>
            <dd className="text-sm font-medium">
              {formatDate(flock.placementDate, context.timezone)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Started laying</dt>
            <dd className="text-sm font-medium">
              {flock.startLayingDate
                ? formatDate(flock.startLayingDate, context.timezone)
                : "Not yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last production recorded</dt>
            <dd className="text-sm font-medium">
              {summary.lastProductionDate
                ? formatRelativeDay(summary.lastProductionDate, context.timezone)
                : "Never"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last vaccination</dt>
            <dd className="text-sm font-medium">
              {summary.lastVaccinationDate
                ? formatRelativeDay(summary.lastVaccinationDate, context.timezone)
                : "None recorded"}
            </dd>
          </div>
        </dl>

        {flock.notes && (
          <p className="mt-4 whitespace-pre-wrap border-t border-border pt-3 text-sm text-muted-foreground">
            {flock.notes}
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <RecentList
          title="Recent production"
          action={
            <Link
              href={`/production?flock=${flock.id}` as Route}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
          items={production.map((day) => ({
            key: day.id,
            primary: `${formatNumber(day.eggsCollected)} eggs`,
            secondary: `${formatRelativeDay(day.productionDate, context.timezone)} · ${formatPercent(day.layingRate)}`,
          }))}
        />

        <RecentList
          title="Recent losses"
          empty="Nothing recorded outside a collection day."
          action={
            <Link
              href={"/health?tab=mortality" as Route}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
          items={mortality.map((record) => ({
            key: record.id,
            primary: record.reason || "Loss recorded",
            secondary: formatRelativeDay(record.recordDate, context.timezone),
            value: String(record.quantity),
          }))}
        />

        <RecentList
          title="Recent feed"
          empty="Nothing recorded outside a collection day."
          action={
            <Link
              href={"/health?tab=feed" as Route}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
          items={feed.map((record) => ({
            key: record.id,
            primary: record.feedType || "Feed",
            secondary: formatRelativeDay(record.usageDate, context.timezone),
            value: formatKg(record.quantityKg),
          }))}
        />

        <RecentList
          title="Vaccinations"
          action={
            <Link
              href={"/health?tab=vaccinations" as Route}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
          items={vaccinations.map((record) => ({
            key: record.id,
            primary: record.vaccineName,
            secondary: formatRelativeDay(record.vaccinationDate, context.timezone),
          }))}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        <Syringe className="mr-1 inline size-3" aria-hidden />
        Hen count is derived from the mortality records above, so it cannot drift.
      </p>
    </PageShell>
  );
}
