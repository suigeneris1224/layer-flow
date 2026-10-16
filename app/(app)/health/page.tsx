import type { Metadata, Route } from "next";
import Link from "next/link";
import { HeartCrack, HeartPulse, Syringe, Wheat } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import {
  canManageVaccinationSchedule,
  canRecordFeed,
  canRecordMortality,
  canRecordVaccination,
} from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getFeedUsage,
  getMortalityRecords,
  getVaccinations,
} from "@/lib/data/health";
import { getFlocks } from "@/lib/data/flocks";
import { getFlockDoses } from "@/lib/data/vaccination-schedule";
import { getFormulaChoices } from "@/lib/data/feed-formulas";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { farmToday, formatCurrency, formatKg, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MortalityForm } from "./mortality-form";
import { FeedForm } from "./feed-form";
import { VaccinationForm, type VaccinationPrefill } from "./vaccination-form";
import { DueDosesPanel } from "./due-doses-panel";
import { ScheduleEditor } from "./schedule-editor";

export const metadata: Metadata = { title: "Flock health" };

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 10;

type Tab = "mortality" | "feed" | "vaccinations";

const TABS: { id: Tab; label: string }[] = [
  { id: "mortality", label: "Mortality" },
  { id: "feed", label: "Feed" },
  { id: "vaccinations", label: "Vaccinations" },
];

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; dose?: string; flock?: string }>;
}) {
  const context = await requireFarmContext();
  const { tab: tabParam, dose: doseParam, flock: flockParam } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "mortality";

  const today = farmToday(context.timezone);
  const supabase = await createSupabaseServerClient();

  // Only one tab is ever rendered at a time, so only its query (or two, for
  // Feed's cost pre-fill) needs to run -- fetching all three record types on
  // every single tab switch was pure wasted latency for the other two.
  const [flocks, mortality, feed, vaccinations, lastFeedResult] = await Promise.all([
    getFlocks(context.farmId),
    tab === "mortality"
      ? getMortalityRecords(context.farmId, { limit: RECENT_LIMIT })
      : Promise.resolve([]),
    tab === "feed" ? getFeedUsage(context.farmId, { limit: RECENT_LIMIT }) : Promise.resolve([]),
    tab === "vaccinations"
      ? getVaccinations(context.farmId, { limit: RECENT_LIMIT })
      : Promise.resolve([]),
    // Same pre-fill the production form uses: one number instead of two.
    tab === "feed"
      ? supabase
          .from("feed_usage")
          .select("cost_per_kg, sack_size_kg, sack_price")
          .eq("farm_id", context.farmId)
          .order("usage_date", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // A retired flock can still receive a correction to its history, so every
  // flock is offered here -- unlike the production form, which is about today.
  const flockChoices = flocks.map((flock) => ({ id: flock.id, name: flock.name }));

  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const offlineEnabled = canAccess(entitlement, "offline_mode");

  // The programme only matters on the vaccinations tab, and only on a plan
  // that has it -- skip both queries otherwise.
  const hasSchedule = canAccess(entitlement, "vaccination_schedule");
  const activeFlocks = flocks.filter(
    (flock) => flock.status === "GROWING" || flock.status === "PRODUCING"
  );
  const formulaChoices =
    tab === "feed" && canAccess(entitlement, "feed_formulation")
      ? await getFormulaChoices(context.farmId)
      : [];
  const schedule =
    tab === "vaccinations" && hasSchedule
      ? await getFlockDoses(context.farmId, activeFlocks, today)
      : { items: [], byFlock: [] };

  // "Record" on a due dose lands here with ?dose=&flock=. Only honoured when
  // both still exist, so a stale link opens a plain form.
  const prefillItem = schedule.items.find((item) => item.id === doseParam);
  const prefill: VaccinationPrefill | null =
    prefillItem && flockChoices.some((flock) => flock.id === flockParam)
      ? { flockId: flockParam!, vaccineName: prefillItem.vaccineName, scheduleItemId: prefillItem.id }
      : null;

  if (flockChoices.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Flock health" description="Losses, feed and vaccinations." />
        <EmptyState
          icon={HeartPulse}
          title="No flocks yet"
          message="Add a flock before recording health records."
          actionLabel="Go to flocks"
          actionHref="/flocks"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Flock health"
        description="Losses, feed and vaccinations that happened outside a collection day."
      />

      <nav aria-label="Health records" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            href={`/health?tab=${entry.id}` as Route}
            aria-current={tab === entry.id ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: tab === entry.id ? "primary" : "outline",
                size: "sm",
              })
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {tab === "mortality" && (
          <>
            <Panel title="Recent losses">
              {mortality.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing recorded outside a collection day.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {mortality.map((record) => (
                    <li key={record.id} className="flex gap-3 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {record.flockName}
                          {record.reason && ` · ${record.reason}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatRelativeDay(record.recordDate, context.timezone)}
                        </p>
                      </div>
                      <span className="text-right text-sm font-semibold tabular">
                        {record.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {canRecordMortality(context) ? (
              <MortalityForm
                records={mortality}
                flocks={flockChoices}
                today={today}
                offlineEnabled={offlineEnabled}
              />
            ) : (
              <StatusNote tone="info" title="Read only">
                Your role doesn&apos;t allow recording losses.
              </StatusNote>
            )}
          </>
        )}

        {tab === "feed" && (
          <>
            <Panel title="Recent feed">
              {feed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing recorded outside a collection day.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {feed.map((record) => (
                    <li key={record.id} className="flex gap-3 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {record.flockName}
                          {record.feedType && ` · ${record.feedType}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatRelativeDay(record.usageDate, context.timezone)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular">
                          {formatKg(record.quantityKg)}
                        </p>
                        {record.totalCost > 0 && (
                          <p className="text-xs tabular text-muted-foreground">
                            {formatCurrency(record.totalCost, context.currency)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {canRecordFeed(context) ? (
              <FeedForm
                records={feed}
                flocks={flockChoices}
                today={today}
                lastCostPerKg={Number(lastFeedResult.data?.cost_per_kg ?? 0)}
                lastSackSizeKg={Number(lastFeedResult.data?.sack_size_kg ?? 0)}
                lastSackPrice={Number(lastFeedResult.data?.sack_price ?? 0)}
                currency={context.currency}
                offlineEnabled={offlineEnabled}
                formulas={formulaChoices}
              />
            ) : (
              <StatusNote tone="info" title="Read only">
                Your role doesn&apos;t allow recording feed.
              </StatusNote>
            )}
          </>
        )}

        {tab === "vaccinations" && (
          <>
            {hasSchedule ? (
              schedule.items.length > 0 && (
                <DueDosesPanel
                  byFlock={schedule.byFlock}
                  today={today}
                  timezone={context.timezone}
                  canRecord={canRecordVaccination(context)}
                />
              )
            ) : (
              <UpgradePanel
                prompt={featureLockedPrompt(entitlement, "vaccination_schedule")}
                className="lg:col-span-2"
              />
            )}

            <Panel title="Recent vaccinations">
              {vaccinations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No vaccinations recorded yet.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {vaccinations.map((record) => (
                    <li key={record.id} className="py-3 first:pt-0">
                      <p className="truncate text-sm font-medium">{record.vaccineName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatRelativeDay(record.vaccinationDate, context.timezone)} ·{" "}
                        {record.flockName}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {canRecordVaccination(context) ? (
              <VaccinationForm
                key={prefill?.scheduleItemId ?? "new"}
                records={vaccinations}
                flocks={flockChoices}
                today={today}
                prefill={prefill}
              />
            ) : (
              <StatusNote tone="info" title="Read only">
                Your role doesn&apos;t allow recording vaccinations.
              </StatusNote>
            )}

            {hasSchedule && canManageVaccinationSchedule(context) && (
              <ScheduleEditor items={schedule.items} />
            )}
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {tab === "mortality" && (
          <>
            <HeartCrack className="mr-1 inline size-3" aria-hidden />
            Losses recorded with a day&apos;s production are shown on that day, not here.
          </>
        )}
        {tab === "feed" && (
          <>
            <Wheat className="mr-1 inline size-3" aria-hidden />
            Feed recorded with a day&apos;s production is shown on that day, not here.
          </>
        )}
        {tab === "vaccinations" && (
          <>
            <Syringe className="mr-1 inline size-3" aria-hidden />
            LayerFlow records what you give and reminds you of your own programme. Ask your vet
            which vaccines and when.
          </>
        )}
      </p>
    </PageShell>
  );
}
