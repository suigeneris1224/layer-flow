import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FarmContext } from "@/lib/auth/session";
import { logger } from "@/lib/observability/logger";
import { openMeteo, type ForecastDay, type HistoryDay } from "@/lib/weather/open-meteo";
import type { Json } from "@/lib/types/database";

/**
 * The farm's weather, cached in `weather_snapshots`.
 *
 * Read path: return the snapshot when it's fresh; otherwise find the farm
 * (its saved map position if the farmer set one from their device, else a
 * geocode of the typed town -- only when that changed), fetch, save with the
 * service-role client, and return. Callers must have checked the `weather` entitlement already. A
 * provider failure falls back to the last snapshot -- weather is never worth
 * an error page.
 */

const FRESH_MS = 3 * 60 * 60 * 1000;

export type WeatherResult =
  | { status: "no_location" }
  | { status: "not_found"; query: string }
  | { status: "unavailable" }
  | {
      status: "ok";
      label: string;
      fetchedAt: string;
      /** True when the refresh failed and this is an older snapshot. */
      stale: boolean;
      days: ForecastDay[];
      history: HistoryDay[];
    };

interface SnapshotRow {
  location_key: string;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  fetched_at: string;
  forecast: { days?: ForecastDay[] } | null;
  daily_history: { days?: HistoryDay[] } | null;
}

function fromSnapshot(row: SnapshotRow, stale: boolean, label?: string): WeatherResult {
  return {
    status: "ok",
    label: label ?? row.location_label ?? "",
    fetchedAt: row.fetched_at,
    stale,
    days: row.forecast?.days ?? [],
    history: row.daily_history?.days ?? [],
  };
}

/** The farm's device-set position, when both halves are present. */
function farmLocation(
  farm: { latitude: number | null; longitude: number | null; location_label: string | null } | null
): { latitude: number; longitude: number; label: string | null } | null {
  if (farm?.latitude == null || farm.longitude == null) return null;
  return {
    latitude: Number(farm.latitude),
    longitude: Number(farm.longitude),
    label: farm.location_label,
  };
}

export const getWeather = cache(async function getWeather(
  context: FarmContext
): Promise<WeatherResult> {
  const supabase = await createSupabaseServerClient();

  const [farmResult, snapshotResult] = await Promise.all([
    supabase
      .from("farms")
      .select("municipality, province, latitude, longitude, location_label")
      .eq("id", context.farmId)
      .maybeSingle(),
    supabase
      .from("weather_snapshots")
      .select(
        "location_key, location_label, latitude, longitude, fetched_at, forecast, daily_history"
      )
      .eq("farm_id", context.farmId)
      .maybeSingle(),
  ]);

  const municipality = farmResult.data?.municipality?.trim() ?? "";
  const province = farmResult.data?.province?.trim() ?? "";
  const pinned = farmLocation(farmResult.data);
  if (!pinned && !municipality) return { status: "no_location" };

  const typedLabel = [municipality, province].filter(Boolean).join(", ");
  // The barangay/town found for a device-set position, else the typed town.
  const pinnedLabel = pinned ? (pinned.label ?? typedLabel) : undefined;
  // A device-set position wins over the typed town; moving it changes the key
  // and so refetches on the next read.
  const locationKey = pinned
    ? `geo|${pinned.latitude.toFixed(3)}|${pinned.longitude.toFixed(3)}`
    : `${municipality}|${province}`.toLowerCase();
  const snapshot = (snapshotResult.data ?? null) as SnapshotRow | null;
  const sameLocation = snapshot?.location_key === locationKey;

  if (
    snapshot &&
    sameLocation &&
    Date.now() - Date.parse(snapshot.fetched_at) < FRESH_MS &&
    (snapshot.forecast?.days?.length ?? 0) > 0
  ) {
    return fromSnapshot(snapshot, false, pinnedLabel);
  }

  try {
    let latitude = pinned?.latitude ?? (sameLocation ? snapshot?.latitude : null);
    let longitude = pinned?.longitude ?? (sameLocation ? snapshot?.longitude : null);
    let label = pinned ? (pinned.label ?? typedLabel) : sameLocation ? (snapshot?.location_label ?? null) : null;

    if (latitude == null || longitude == null) {
      const place = await openMeteo.geocode(municipality, province);
      if (!place) {
        return { status: "not_found", query: typedLabel };
      }
      latitude = place.latitude;
      longitude = place.longitude;
      label = place.label;
    }

    const { days, history } = await openMeteo.forecast(
      Number(latitude),
      Number(longitude),
      context.timezone
    );

    const row = {
      farm_id: context.farmId,
      location_key: locationKey,
      location_label: label,
      latitude: Number(latitude),
      longitude: Number(longitude),
      fetched_at: new Date().toISOString(),
      forecast: { days } as unknown as Json,
      daily_history: { days: history } as unknown as Json,
    };

    const { error } = await createSupabaseAdminClient()
      .from("weather_snapshots")
      .upsert(row, { onConflict: "farm_id" });
    if (error) logger.error("weather snapshot save failed", { reason: error.message });

    return {
      status: "ok",
      label: label ?? municipality,
      fetchedAt: row.fetched_at,
      stale: false,
      days,
      history,
    };
  } catch (error) {
    logger.error("weather refresh failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return snapshot && sameLocation
      ? fromSnapshot(snapshot, true, pinnedLabel)
      : { status: "unavailable" };
  }
});
