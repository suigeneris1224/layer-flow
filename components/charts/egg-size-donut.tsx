"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { SizeSlice } from "@/lib/data/dashboard";
import { formatNumber, formatPercent } from "@/lib/format";

const SLICE_COLOURS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-2))",
];

/**
 * Today's collection by egg size.
 *
 * The legend carries the numbers, not the arcs: a donut alone is not readable
 * for someone who cannot distinguish the hues, and the design policy requires
 * a text equivalent beside every chart.
 */
export function EggSizeDonut({ slices, total }: { slices: SizeSlice[]; total: number }) {
  if (slices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No eggs sorted by size today yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="quantity"
              nameKey="name"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice, index) => (
                <Cell key={slice.name} fill={SLICE_COLOURS[index % SLICE_COLOURS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centre total. aria-hidden because the list below says the same. */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden
        >
          <span className="text-xl font-bold tabular">{formatNumber(total)}</span>
          <span className="text-[11px] text-muted-foreground">Total eggs</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2">
        {slices.map((slice, index) => (
          <li key={slice.name} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: SLICE_COLOURS[index % SLICE_COLOURS.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{slice.name}</span>
            <span className="shrink-0 font-medium tabular">{formatPercent(slice.percentage, 0)}</span>
            <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular">
              ({formatNumber(slice.quantity)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
