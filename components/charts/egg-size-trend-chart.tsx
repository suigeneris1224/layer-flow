"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SizeTrendPoint } from "@/lib/data/analytics";

const SLICE_COLOURS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-2))",
];

/**
 * Size mix over the date range -- the donut answers "what's today's mix,"
 * this answers "how has it moved." Same source rows as the donut, grouped by
 * day instead of collapsed to one total.
 */
export function EggSizeTrendChart({
  points,
  sizes,
}: {
  points: SizeTrendPoint[];
  sizes: string[];
}) {
  const hasData = points.some((point) =>
    sizes.some((size) => Number(point[size]) > 0)
  );

  if (sizes.length === 0 || !hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No eggs sorted by size in this period yet.
      </p>
    );
  }

  const tickInterval = Math.max(0, Math.floor(points.length / 10) - 1);

  return (
    <div>
      <div className="h-[180px] w-full lg:h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />

            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value: number) => `${value}%`}
            />

            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--surface))",
                fontSize: 12,
              }}
              formatter={(value: number, name) => [`${value}%`, name]}
            />

            {sizes.map((size, index) => (
              <Area
                key={size}
                type="monotone"
                dataKey={size}
                stackId="sizes"
                stroke={SLICE_COLOURS[index % SLICE_COLOURS.length]}
                fill={SLICE_COLOURS[index % SLICE_COLOURS.length]}
                fillOpacity={0.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {sizes.map((size, index) => (
          <span key={size} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: SLICE_COLOURS[index % SLICE_COLOURS.length] }}
              aria-hidden
            />
            {size}
          </span>
        ))}
      </p>
    </div>
  );
}
