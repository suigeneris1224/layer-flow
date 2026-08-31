import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canRecordProduction } from "@/lib/auth/permissions";
import { getProductionDay } from "@/lib/data/production";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button";
import {
  formatCurrency,
  formatDate,
  formatKg,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Production day" };

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular">{value}</dd>
    </div>
  );
}

export default async function ProductionDayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireFarmContext();

  const day = await getProductionDay(context.farmId, id);
  if (!day) notFound();

  const breakdownTotal = day.sizes.reduce((sum, size) => sum + size.quantity, 0);
  const ungraded = day.eggsCollected - breakdownTotal;

  return (
    <PageShell width="reading">
      <PageHeader
        title={formatDate(day.productionDate, context.timezone)}
        description={day.flockName}
        action={
          canRecordProduction(context) && (
            <Link
              href={`/production/new?flock=${day.flockId}&date=${day.productionDate}` as Route}
              className={cn(buttonVariants({ size: "md" }))}
            >
              <Pencil className="size-4" aria-hidden />
              Edit this day
            </Link>
          )
        }
      />

      <Link
        href="/production"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to production
      </Link>

      <Panel title="Collection">
        <dl className="divide-y divide-border">
          <Row label="Hens present" value={formatNumber(day.hensPresent)} />
          <Row label="Eggs collected" value={formatNumber(day.eggsCollected)} />
          <Row label="Laying rate" value={formatPercent(day.layingRate)} />
          <Row label="Broken" value={formatNumber(day.brokenEggs)} />
          <Row label="Dirty" value={formatNumber(day.dirtyEggs)} />
          {day.averageEggWeight !== null && (
            <Row
              label="Average egg weight"
              value={`${formatNumber(day.averageEggWeight, 1)} g`}
            />
          )}
        </dl>
      </Panel>

      <Panel title="Egg sizes">
        {day.sizes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No size breakdown was recorded for this day.
          </p>
        ) : (
          <dl className="divide-y divide-border">
            {day.sizes.map((size) => (
              <Row
                key={size.eggSizeId}
                label={size.eggSizeName}
                value={formatNumber(size.quantity)}
              />
            ))}
            {ungraded > 0 && (
              <Row label="Ungraded" value={formatNumber(ungraded)} />
            )}
          </dl>
        )}
      </Panel>

      <Panel title="Feed and mortality">
        <dl className="divide-y divide-border">
          {day.feed ? (
            <>
              <Row label="Feed used" value={formatKg(day.feed.quantityKg)} />
              <Row
                label="Feed cost"
                value={formatCurrency(day.feed.totalCost, context.currency)}
              />
            </>
          ) : (
            <Row label="Feed used" value="Not recorded" />
          )}

          <Row label="Birds lost" value={formatNumber(day.mortality)} />
          {day.linkedMortality?.reason && (
            <Row label="Reason" value={day.linkedMortality.reason} />
          )}
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          Incidents recorded outside a collection day are on the{" "}
          <Link href={"/health" as Route} className="underline underline-offset-2">
            flock health
          </Link>{" "}
          page.
        </p>
      </Panel>

      {day.notes && (
        <Panel title="Notes">
          <p className="whitespace-pre-wrap text-sm">{day.notes}</p>
        </Panel>
      )}
    </PageShell>
  );
}
