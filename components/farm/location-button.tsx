"use client";

import { useEffect, useState } from "react";
import { Check, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";

export interface FarmCoordinates {
  latitude: number;
  longitude: number;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * "Use my current location" -- saves where the farmer is standing as the
 * farm's map position, for the weather forecast.
 *
 * Only ever on a tap: the location is the farm's, not the viewer's, so it is
 * never read in the background (an owner checking from town must still get
 * the farm's weather). Rounded to 3 decimals (~110 m) before it leaves the
 * browser; the schema rounds again on the server.
 */
export function LocationButton({
  value,
  onChange,
}: {
  value: FarmCoordinates | null;
  onChange: (value: FarmCoordinates | null) => void;
}) {
  const [supported, setSupported] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checked after mount so the server render and first client render match.
  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "geolocation" in navigator);
  }, []);

  if (!supported) return null;

  function locate() {
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({
          latitude: round3(position.coords.latitude),
          longitude: round3(position.coords.longitude),
        });
      },
      (failure) => {
        setLocating(false);
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location is blocked. Allow it in your browser settings, or we'll use your town instead."
            : "Couldn't get your location. Try again outside or near a window."
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-[hsl(var(--status-good))]">
            <Check className="size-4" aria-hidden />
            Location set
          </span>
          <span className="tabular text-muted-foreground">
            ({value.latitude.toFixed(3)}, {value.longitude.toFixed(3)})
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={locate} loading={locating}>
            Update
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            Remove
          </Button>
        </p>
      ) : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={locate} loading={locating}>
            <LocateFixed className="size-4" aria-hidden />
            {locating ? "Finding your location…" : "Use my current location"}
          </Button>
        </div>
      )}
      {error && <StatusNote tone="warn">{error}</StatusNote>}
    </div>
  );
}
