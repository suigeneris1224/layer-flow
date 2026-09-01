import { Egg, LayoutGrid, Layers, PhilippinePeso, Receipt, Settings, TrendingUp } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import { layingRate } from "@/lib/domain/calculations";
import { formatCurrencyShort, formatNumber, formatPercent } from "@/lib/format";

const HENS = 942;
const EGGS_TODAY = 820;
const FEED_KG = 115;
const REVENUE = 5900;
const EST_PROFIT = 1850;

const SIDEBAR = [
  { icon: LayoutGrid, label: "Overview", active: true },
  { icon: Layers, label: "Flocks" },
  { icon: Egg, label: "Production" },
  { icon: PhilippinePeso, label: "Egg Sales" },
  { icon: Receipt, label: "Expenses" },
  { icon: TrendingUp, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

/** A hand-built line, not real chart data -- just enough to read as "a week of production". */
const CHART_POINTS = "0,34 20,30 40,32 60,22 80,26 100,14 120,18 140,8";

/**
 * The hero's product visual: a coded recreation of the real dashboard's
 * layout and tokens (see app/(app)/dashboard/page.tsx and
 * components/dashboard/today-status.tsx), not a screenshot -- so it stays
 * accurate as the real dashboard evolves and never shows a stranger's data.
 */
export function DashboardMockup() {
  const rate = layingRate(EGGS_TODAY, HENS);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-accent/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
      </div>

      <div className="flex">
        {/* Mini sidebar -- desktop only, the phone-width crop drops it. */}
        <div className="hidden w-32 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/20 p-2 sm:flex">
          {SIDEBAR.map((item) => (
            <span
              key={item.label}
              className={
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium " +
                (item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground")
              }
            >
              <item.icon className="size-3" aria-hidden />
              {item.label}
            </span>
          ))}
        </div>

        <div className="flex-1 p-3 sm:p-4">
          <p className="text-xs font-semibold sm:text-sm">
            Good morning <span aria-hidden>👋</span>
          </p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">
            Here&apos;s how your farm is doing today.
          </p>

          {/* KPI tiles */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile icon={Layers} tint="green" label="Current hens" value={formatNumber(HENS)} />
            <Tile icon={Egg} tint="amber" label="Eggs today" value={formatNumber(EGGS_TODAY)} />
            <Tile icon={TrendingUp} tint="teal" label="Laying rate" value={formatPercent(rate)} />
            <Tile
              icon={PhilippinePeso}
              tint="violet"
              label="Revenue"
              value={formatCurrencyShort(REVENUE)}
            />
          </div>

          {/* Chart */}
          <div className="mt-3 rounded-lg border border-border p-2 sm:p-3">
            <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
              Egg production
            </p>
            <svg viewBox="0 0 140 40" className="mt-1 h-12 w-full text-primary" aria-hidden>
              <polyline
                points={CHART_POINTS}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Status chip */}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[hsl(var(--status-good))]/10 px-3 py-2">
            <span className="text-[10px] font-medium text-[hsl(var(--status-good))] sm:text-xs">
              Production is normal
            </span>
            <span className="text-[9px] text-muted-foreground sm:text-[10px] tabular">
              Est. profit {formatCurrencyShort(EST_PROFIT)} · {formatNumber(FEED_KG)} kg feed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({
  icon,
  tint,
  label,
  value,
}: {
  icon: typeof Egg;
  tint: "green" | "amber" | "teal" | "violet";
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border p-2">
      <IconChip icon={icon} tint={tint} size="sm" />
      <p className="mt-1.5 text-sm font-bold tabular sm:text-base">{value}</p>
      <p className="text-[9px] text-muted-foreground sm:text-[10px]">{label}</p>
    </div>
  );
}
