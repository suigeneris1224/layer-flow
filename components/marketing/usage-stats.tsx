"use client";

import { useEffect, useState } from "react";
import { Bird, Egg, MapPin, Warehouse, type LucideIcon } from "lucide-react";
import { IconChip, type ChipTint } from "@/components/ui/icon-chip";
import { compactCount, type PublicStats } from "@/lib/domain/public-stats";
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
 * "LayerFlow so far": real totals across every farm, from
 * app/api/public-stats. Renders nothing until there are enough farms to be
 * worth showing (lib/domain/public-stats.ts), or if the lookup fails -- no
 * empty gap, no placeholder numbers. Loaded after the page so the homepage
 * itself stays static.
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
          title="Layer farms across the Philippines keep their records here."
          lead="Live totals from farms using LayerFlow, updated every hour."
        />
        <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TILES.map((tile) => (
            <li
              key={tile.key}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center shadow-card"
            >
              <IconChip icon={tile.icon} tint={tile.tint} />
              <p className="text-3xl font-bold tabular text-foreground">
                {compactCount(stats[tile.key])}
              </p>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}
