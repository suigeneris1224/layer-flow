import type { Metadata, Route } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canRecordBiosecurity } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getChecks, getLatestChecks, getVisits } from "@/lib/data/biosecurity";
import { getHouses } from "@/lib/data/houses";
import {
  CHECK_LABELS,
  CHECK_TYPES,
  daysSinceLastCheck,
  recentPoultryContactDays,
} from "@/lib/domain/biosecurity";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { buttonVariants } from "@/components/ui/button";
import { farmToday, formatRelativeDay, shiftDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VisitForm } from "./visit-form";
import { CheckForm } from "./check-form";
import { DeleteEntryButton } from "./delete-entry-button";

export const metadata: Metadata = { title: "Biosecurity" };

export const dynamic = "force-dynamic";

type Tab = "visitors" | "checks";

const TABS: { id: Tab; label: string }[] = [
  { id: "visitors", label: "Visitors" },
  { id: "checks", label: "Checks" },
];

export default async function BiosecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "biosecurity")) {
    return (
      <PageShell width="reading">
        <PageHeader title="Biosecurity" description="Visitors and routine checks." />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "biosecurity")} />
      </PageShell>
    );
  }

  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "visitors";
  const today = farmToday(context.timezone);
  const canRecord = canRecordBiosecurity(context);

  const [visits, checks, latest, houses] = await Promise.all([
    tab === "visitors" ? getVisits(context.farmId) : Promise.resolve([]),
    tab === "checks" ? getChecks(context.farmId) : Promise.resolve([]),
    tab === "checks" ? getLatestChecks(context.farmId, shiftDate(today, -365)) : Promise.resolve([]),
    tab === "checks" ? getHouses(context.farmId) : Promise.resolve([]),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Biosecurity"
        description="Who came onto the farm, and when the routine checks were last done."
      />

      <nav aria-label="Biosecurity records" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            href={`/biosecurity?tab=${entry.id}` as Route}
            aria-current={tab === entry.id ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: tab === entry.id ? "primary" : "outline", size: "sm" })
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {tab === "visitors" && (
          <>
            <Panel title="Recent visitors">
              {visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visitors logged yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {visits.map((visit) => {
                    const contact = recentPoultryContactDays(
                      visit.lastPoultryContactDate,
                      visit.visitDate
                    );
                    return (
                      <li key={visit.id} className="flex gap-3 py-3 first:pt-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {visit.visitorName}
                            {visit.purpose && ` · ${visit.purpose}`}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatRelativeDay(visit.visitDate, context.timezone)}
                            {visit.vehiclePlate && ` · ${visit.vehiclePlate}`}
                            {visit.disinfected ? " · Disinfected" : " · Not disinfected"}
                            {visit.recordedByName && ` · by ${visit.recordedByName}`}
                          </p>
                          {contact !== null && (
                            <p className="mt-1 text-xs font-medium text-[hsl(var(--status-warn))]">
                              Near other poultry{" "}
                              {contact === 0
                                ? "the same day"
                                : `${contact} ${contact === 1 ? "day" : "days"} before`}
                            </p>
                          )}
                        </div>
                        {canRecord && <DeleteEntryButton kind="visit" id={visit.id} />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {canRecord ? (
              <VisitForm today={today} />
            ) : (
              <StatusNote tone="info" title="Read only">
                Your role doesn&apos;t allow logging visitors.
              </StatusNote>
            )}
          </>
        )}

        {tab === "checks" && (
          <>
            <Panel title="Last done">
              <ul className="grid grid-cols-2 gap-3">
                {CHECK_TYPES.filter((type) => type !== "OTHER").map((type) => {
                  const days = daysSinceLastCheck(latest, type, today);
                  return (
                    <li key={type} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">{CHECK_LABELS[type]}</p>
                      <p className="mt-1 text-sm font-semibold tabular">
                        {days === null
                          ? "Not logged"
                          : days === 0
                            ? "Today"
                            : `${days} ${days === 1 ? "day" : "days"} ago`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            {canRecord ? (
              <CheckForm
                today={today}
                houses={houses.map((house) => ({ id: house.id, name: house.name }))}
              />
            ) : (
              <StatusNote tone="info" title="Read only">
                Your role doesn&apos;t allow logging checks.
              </StatusNote>
            )}

            <Panel title="Recent checks" className="lg:col-span-2">
              {checks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checks logged yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {checks.map((check) => (
                    <li key={check.id} className="flex gap-3 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {CHECK_LABELS[check.checkType]}
                          {check.houseName && ` · ${check.houseName}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatRelativeDay(check.checkDate, context.timezone)}
                          {check.notes && ` · ${check.notes}`}
                          {check.recordedByName && ` · by ${check.recordedByName}`}
                        </p>
                      </div>
                      {canRecord && <DeleteEntryButton kind="check" id={check.id} />}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        <ShieldCheck className="mr-1 inline size-3" aria-hidden />
        LayerFlow keeps the log. For what your farm&apos;s biosecurity routine should be, ask your
        vet or the local agriculture office.
      </p>
    </PageShell>
  );
}
