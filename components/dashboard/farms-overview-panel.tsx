import Link from "next/link";
import { Bird, Home, Layers } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusNote } from "@/components/ui/states";
import type { FarmOverview } from "@/lib/data/farms";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * How the farm is set up, as opposed to how it did today.
 *
 * Everything above this on the dashboard is a daily figure. This is the
 * structure those figures sit inside -- houses, flocks, birds and how full
 * the sheds are -- so it closes the page rather than competing with the KPIs.
 */
export function FarmsOverviewPanel({
  farmName,
  overview,
  className,
}: {
  farmName: string;
  overview: FarmOverview;
  className?: string;
}) {
  const { houseCount, activeFlockCount, totalBirds, totalCapacity, capacityUsed } =
    overview;

  const stats = [
    {
      icon: Home,
      label: houseCount === 1 ? "House" : "Houses",
      value: formatNumber(houseCount),
      href: "/houses" as const,
    },
    {
      icon: Layers,
      label: activeFlockCount === 1 ? "Active flock" : "Active flocks",
      value: formatNumber(activeFlockCount),
      href: "/flocks" as const,
    },
    {
      icon: Bird,
      label: "Live birds",
      value: formatNumber(totalBirds),
      href: "/flocks" as const,
    },
  ];

  // Over capacity is a real situation -- a farmer can place more birds than a
  // house is rated for -- so it is reported, not clamped away.
  const overCapacity = capacityUsed !== null && capacityUsed > 100;

  return (
    <Panel
      title="Farms overview"
      className={className}
      action={
        <Link href="/farms" className="text-xs text-muted-foreground hover:text-foreground">
          Farm settings
        </Link>
      }
    >
      <p className="mb-3 truncate text-sm font-medium">{farmName}</p>

      {/*
        Two halves on a wide screen: the counts read as a group on the left
        rather than drifting apart across the full width of the page.
      */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
        <dl className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <stat.icon className="size-3.5" aria-hidden />
                {stat.label}
              </dt>
              <dd className="text-lg font-semibold tabular">
                <Link href={stat.href} className="hover:underline">
                  {stat.value}
                </Link>
              </dd>
            </div>
          ))}
        </dl>

        {capacityUsed === null ? (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground lg:border-t-0 lg:pt-0">
            Set a capacity on your houses to see how full the farm is.
          </p>
        ) : (
          <div className="self-end border-t border-border pt-3 lg:border-t-0 lg:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">Capacity used</span>
              <span className="text-sm font-semibold tabular">
                {formatPercent(capacityUsed)}
              </span>
            </div>

            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${formatNumber(totalBirds)} birds in space for ${formatNumber(totalCapacity)}`}
            >
              <div
                className={cn("h-full rounded-full", overCapacity ? "bg-bad" : "bg-good")}
                style={{ width: `${Math.min(100, capacityUsed)}%` }}
              />
            </div>

            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatNumber(totalBirds)} birds in space for {formatNumber(totalCapacity)}
            </p>
          </div>
        )}
      </div>

      {houseCount === 0 && (
        <StatusNote tone="info" className="mt-3">
          Add a house to start placing flocks.
        </StatusNote>
      )}

      {overCapacity && (
        <StatusNote tone="warn" className="mt-3">
          You have more birds than your houses are rated for.
        </StatusNote>
      )}
    </Panel>
  );
}
