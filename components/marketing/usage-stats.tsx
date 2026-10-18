"use client";

import { useEffect, useRef, useState } from "react";
import { Bird, Egg, MapPin, Warehouse, type LucideIcon } from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import {
  COUNT_UP_MS,
  compactCount,
  countUpValue,
  type PublicStats,
} from "@/lib/domain/public-stats";
import { Reveal } from "./reveal";
import { Section, SectionHeading } from "./section";

type Response = ({ show: true } & PublicStats) | { show: false };

const TILES: { key: keyof PublicStats; label: string; icon: LucideIcon; tint: ChipTint }[] = [
  { key: "farms", label: "Farms using LayerFlow", icon: Warehouse, tint: "green" },
  { key: "eggs", label: "Eggs recorded", icon: Egg, tint: "amber" },
  { key: "hens", label: "Hens tracked", icon: Bird, tint: "teal" },
  { key: "provinces", label: "Provinces", icon: MapPin, tint: "violet" },
];

/**
 * Counts every tile up from 0 once, the first time the tiles scroll into
 * view. Returns progress 0-1; straight to 1 for anyone who asked for reduced
 * motion.
 */
function useCountUp(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / COUNT_UP_MS);
          setProgress(t);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref]);

  return progress;
}

function StatTiles({ stats }: { stats: PublicStats }) {
  const ref = useRef<HTMLUListElement>(null);
  const progress = useCountUp(ref);

  return (
    <ul ref={ref} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES.map((tile) => (
        <li
          key={tile.key}
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center shadow-card"
        >
          <IconChip icon={tile.icon} tint={tile.tint} />
          <p className="text-3xl font-bold tabular text-foreground">
            {/* Screen readers get the real number, never a half-counted one. */}
            <span aria-hidden>{compactCount(countUpValue(stats[tile.key], progress))}</span>
            <span className="sr-only">{compactCount(stats[tile.key])}</span>
          </p>
          <p className="text-sm text-muted-foreground">{tile.label}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * "LayerFlow so far": real totals across every farm, from
 * app/api/public-stats. Renders nothing until there are enough farms to show
 * (lib/domain/public-stats.ts), or if the lookup fails -- no empty gap, no
 * placeholder numbers. Loaded after the page so the homepage itself stays
 * static. The copy makes no claim the numbers don't back, so it reads true
 * at two farms as well as two hundred.
 */
export function UsageStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public-stats", { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<Response>) : null))
      .then((body) => {
        if (body?.show) setStats(body);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!stats) return null;

  return (
    <Section aria-label="LayerFlow so far">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="LayerFlow so far"
          title="Real farms, real records."
          lead="Live totals from farms using LayerFlow."
        />
        <StatTiles stats={stats} />
      </Reveal>
    </Section>
  );
}
