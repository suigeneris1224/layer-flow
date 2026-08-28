/**
 * Turning stored data into the words the dashboard shows.
 *
 * Pure module: no React, no Supabase, no I/O. Kept separate from the panels so
 * the wording is testable -- and so the one rule that really matters here
 * cannot quietly regress: LayerFlow reports what it measured, and never
 * implies a judgement it has no basis for.
 */

import { formatCurrency, formatNumber } from "@/lib/format";
import { THRESHOLDS } from "@/lib/domain/alerts";

/**
 * Time-of-day greeting.
 *
 * The small hours count as morning: layer farmers are collecting before dawn,
 * and "Good evening" at 4am would read as a bug.
 */
export function greetingFor(hour: number): string {
  if (!Number.isFinite(hour)) return "Hello";
  if (hour >= 18 && hour <= 23) return "Good evening";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good morning";
}

export interface ActivityLine {
  title: string;
  detail: string;
}

type Metadata = Record<string, unknown> | null;

function num(metadata: Metadata, key: string): number | null {
  const raw = metadata?.[key];
  const value = typeof raw === "string" ? Number(raw) : raw;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(metadata: Metadata, key: string): string | null {
  const raw = metadata?.[key];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * An audit row rendered for the activity feed.
 *
 * Unknown actions get a generic line rather than leaking a dotted machine
 * string like "something.new" at the farmer.
 */
export function describeActivity(row: {
  action: string;
  metadata: Metadata;
}): ActivityLine {
  const { action, metadata } = row;

  switch (action) {
    case "production.recorded":
    case "production.updated": {
      const eggs = num(metadata, "eggs");
      return {
        title: "Recorded production",
        detail: eggs === null ? "Daily record saved" : `${formatNumber(eggs)} eggs`,
      };
    }

    case "sale.recorded": {
      const total = num(metadata, "total");
      return {
        title: "Recorded a sale",
        detail: total === null ? "Sale saved" : formatCurrency(total),
      };
    }

    case "expense.recorded": {
      const amount = num(metadata, "amount");
      return {
        title: "Added an expense",
        detail: amount === null ? "Expense saved" : formatCurrency(amount),
      };
    }

    case "inventory.adjusted": {
      const size = str(metadata, "sizeName") ?? "Stock";
      const quantity = num(metadata, "quantityEggs");
      if (quantity === null) return { title: "Adjusted stock", detail: size };
      const verb = quantity < 0 ? "removed" : "added";
      return {
        title: "Adjusted stock",
        detail: `${size} — ${verb} ${formatNumber(Math.abs(quantity))} eggs`,
      };
    }

    case "egg_prices.updated": {
      const perTray = num(metadata, "pricePerTray");
      return {
        title: "Updated a price",
        detail: perTray === null ? "Price saved" : `${formatCurrency(perTray)} a tray`,
      };
    }

    case "flock.created":
      return { title: "Added a flock", detail: str(metadata, "name") ?? "New flock" };

    case "house.created":
      return { title: "Added a house", detail: str(metadata, "name") ?? "New house" };

    case "farm.created":
      return { title: "Created the farm", detail: str(metadata, "name") ?? "New farm" };

    default:
      return { title: "Farm activity", detail: "Record updated" };
  }
}

export interface FlockStatus {
  headline: string;
  detail: string;
  tone: "good" | "warn" | "bad";
}

/**
 * The flock summary card.
 *
 * This deliberately reports **mortality**, not health. LayerFlow can count
 * birds; it cannot examine them. Telling a farmer "no health issues detected"
 * when a flock is incubating a problem would be worse than saying nothing, so
 * the wording stays with what was actually measured (spec section 28).
 */
export function flockStatusLine(deaths: number, hensPresent: number): FlockStatus {
  if (hensPresent <= 0) {
    return {
      headline: "No active flock",
      detail: "Add a flock to start tracking.",
      tone: "good",
    };
  }

  if (deaths <= 0) {
    return {
      headline: "Normal",
      detail: "No birds lost this week.",
      tone: "good",
    };
  }

  const rate = deaths / hensPresent;
  const birds = `${formatNumber(deaths)} ${deaths === 1 ? "bird" : "birds"}`;

  if (rate > THRESHOLDS.dailyMortalityRate * 3) {
    return {
      headline: "Above your usual range",
      detail: `${birds} lost this week — higher than normal for this flock.`,
      tone: "bad",
    };
  }

  if (rate > THRESHOLDS.dailyMortalityRate) {
    return {
      headline: "Slightly raised",
      detail: `${birds} lost this week, a little above your usual range.`,
      tone: "warn",
    };
  }

  return {
    headline: "Normal",
    detail: `${birds} lost this week, within your usual range.`,
    tone: "good",
  };
}
