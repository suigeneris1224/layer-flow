"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/states";

/**
 * Charts, deferred.
 *
 * Recharts is ~110 kB and is the heaviest thing on the dashboard. Loading it
 * eagerly pushed First Load JS to 216 kB, which on a rural 3G connection
 * delays the figures a farmer actually opened the app for.
 *
 * Importing through `next/dynamic` with `ssr: false` keeps it out of the
 * critical path: the KPI row and panels paint immediately, and the charts fill
 * in a moment later behind a skeleton of the same height so nothing jumps.
 *
 * `ssr: false` requires a client boundary, which is what this file is for.
 */

function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? "h-[180px] w-full lg:h-[230px]"} />;
}

export const ProductionChart = dynamic(
  () => import("./production-chart").then((mod) => mod.ProductionChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const EggSizeDonut = dynamic(
  () => import("./egg-size-donut").then((mod) => mod.EggSizeDonut),
  { ssr: false, loading: () => <ChartSkeleton className="h-[150px] w-full" /> }
);

export const SalesChart = dynamic(() => import("./sales-chart").then((mod) => mod.SalesChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[180px] w-full lg:h-[210px]" />,
});

export const LayingRateChart = dynamic(
  () => import("./laying-rate-chart").then((mod) => mod.LayingRateChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const ProfitChart = dynamic(() => import("./profit-chart").then((mod) => mod.ProfitChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[180px] w-full lg:h-[210px]" />,
});

export const ExpenseCategoryChart = dynamic(
  () => import("./expense-category-chart").then((mod) => mod.ExpenseCategoryChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-[220px] w-full" /> }
);
