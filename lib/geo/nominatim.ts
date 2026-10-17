import "server-only";

import { placeLabel, type ReverseAddress } from "@/lib/domain/geo";
import { logger } from "@/lib/observability/logger";

/**
 * Reverse geocoding via OpenStreetMap Nominatim: the barangay/town name for a
 * farm's saved map position, shown instead of raw coordinates.
 *
 * Called once per "Use my current location" tap -- far under Nominatim's
 * 1 request/second usage policy. The policy asks for an identifying
 * User-Agent (no personal data in it) and "© OpenStreetMap contributors"
 * attribution, shown next to the place name and on the privacy page.
 * Never throws: a failed lookup just means no label.
 */

const TIMEOUT_MS = 6_000;
const USER_AGENT = "LayerFlow/1.0 (+https://getlayerflow.com)";

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude.toFixed(3));
  url.searchParams.set("lon", longitude.toFixed(3));
  url.searchParams.set("zoom", "14");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    if (!response.ok) {
      logger.error("reverse geocode failed", { reason: `status ${response.status}` });
      return null;
    }
    const data = (await response.json()) as { address?: ReverseAddress };
    return placeLabel(data.address);
  } catch (error) {
    logger.error("reverse geocode failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
