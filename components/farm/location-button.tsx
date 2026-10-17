"use client";

import { useEffect, useState } from "react";
import { Check, LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";

export interface FarmCoordinates {
  latitude: number;
  longitude: number;
}

export interface FarmLocationValue extends FarmCoordinates {
  /** Barangay/town found for the position; null when none was found. */
  label?: string | null;
}

type SaveResult = { ok: true; label: string | null } | { ok: false; error: string };

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * "Use my current location" -- saves where the farmer is standing as the
 * farm's map position, for the weather forecast.
 *
 * Two modes:
 *   - with `save` (Farm settings): saved the moment it's captured, then the
 *     barangay/town comes back from the server and is shown;
 *   - without (onboarding, "Add a farm"): held in the form and saved with it,
 *     and says so, so it never looks finished before it is.
 *
 * Only ever on a tap: the location is the farm's, not the viewer's, so it is
 * never read in the background (an owner checking from town must still get
 * the farm's weather). Rounded to 3 decimals (~110 m) before it leaves the
 * browser; the schema rounds again on the server.
 */
export function LocationButton({
  value,
  onChange,
  save,
}: {
  value: FarmLocationValue | null;
  onChange: (value: FarmLocationValue | null) => void;
  save?: (coordinates: FarmCoordinates | null) => Promise<SaveResult>;
}) {
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<"idle" | "locating" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  // Checked after mount so the server render and first client render match.
  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "geolocation" in navigator);
  }, []);

  if (!supported) return null;

  async function persist(coordinates: FarmCoordinates | null) {
    if (!save) {
      onChange(coordinates);
      return;
    }
    setStatus("saving");
    const result = await save(coordinates);
    setStatus("idle");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(coordinates && { ...coordinates, label: result.label });
  }

  function locate() {
    setError(null);
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void persist({
          latitude: round3(position.coords.latitude),
          longitude: round3(position.coords.longitude),
        });
      },
      (failure) => {
        setStatus("idle");
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location is blocked. Allow it in your browser settings, or we'll use your town instead."
            : "Couldn't get your location. Try again outside or near a window."
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }

  const busy = status !== "idle";
  const busyLabel = status === "saving" ? "Saving…" : "Finding your location…";

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {save ? (
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="size-4 text-[hsl(var(--status-good))]" aria-hidden />
                {value.label ?? "Location saved"}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-[hsl(var(--status-good))]">
                <Check className="size-4" aria-hidden />
                Location captured. It&apos;s saved when you continue.
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={locate} loading={busy}>
              {busy ? busyLabel : "Update"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setError(null);
                void persist(null);
              }}
            >
              Remove
            </Button>
          </div>
          {save && value.label && (
            <p className="text-[11px] text-muted-foreground">
              Place names ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OpenStreetMap contributors
              </a>
            </p>
          )}
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={locate} loading={busy}>
            <LocateFixed className="size-4" aria-hidden />
            {busy ? busyLabel : "Use my current location"}
          </Button>
        </div>
      )}
      {error && <StatusNote tone="warn">{error}</StatusNote>}
    </div>
  );
}
