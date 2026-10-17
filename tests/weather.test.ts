import { describe, expect, it } from "vitest";
import {
  formatHour,
  heatIndexC,
  heatIndexLevel,
  peakHeat,
} from "@/lib/domain/weather";
import { heatAlert } from "@/lib/domain/alerts";

describe("heatIndexC", () => {
  // Checked against NOAA's published heat index chart (°F), converted to °C.
  it("matches NOAA's table: 90 °F at 70% is about 106 °F", () => {
    // 32.2 °C / 70% -> ~41 °C
    expect(heatIndexC(32.2, 70)).toBeGreaterThan(40.5);
    expect(heatIndexC(32.2, 70)).toBeLessThan(41.8);
  });

  it("gives about 40 °C for 32 °C at 70% humidity", () => {
    const value = heatIndexC(32, 70);
    expect(value).toBeGreaterThan(39.5);
    expect(value).toBeLessThan(41.5);
  });

  it("matches NOAA's table: 96 °F at 55% is about 112 °F", () => {
    // 35.6 °C / 55% -> ~44.4 °C
    expect(heatIndexC(35.6, 55)).toBeGreaterThan(43.8);
    expect(heatIndexC(35.6, 55)).toBeLessThan(45);
  });

  it("stays close to air temperature when it's mild", () => {
    expect(Math.abs(heatIndexC(24, 50) - 24)).toBeLessThan(1.5);
  });
});

describe("heatIndexLevel", () => {
  it("uses PAGASA's bands", () => {
    expect(heatIndexLevel(26.9)).toBe("none");
    expect(heatIndexLevel(27)).toBe("caution");
    expect(heatIndexLevel(33)).toBe("extreme_caution");
    expect(heatIndexLevel(41.9)).toBe("extreme_caution");
    expect(heatIndexLevel(42)).toBe("danger");
    expect(heatIndexLevel(52)).toBe("extreme_danger");
  });
});

describe("peakHeat", () => {
  it("finds the hottest hour by heat index, not air temperature", () => {
    const peak = peakHeat([
      { time: "2026-10-16T11:00", tempC: 33, humidityPct: 40 },
      { time: "2026-10-16T14:00", tempC: 32, humidityPct: 75 },
    ]);
    expect(peak?.hour).toBe(14);
  });

  it("is null without readings", () => {
    expect(peakHeat([])).toBeNull();
  });
});

describe("formatHour", () => {
  it("reads like a clock", () => {
    expect(formatHour(0)).toBe("12 AM");
    expect(formatHour(14)).toBe("2 PM");
    expect(formatHour(12)).toBe("12 PM");
  });
});

describe("heatAlert", () => {
  const day = (overrides: Partial<Parameters<typeof heatAlert>[0][number]>) => ({
    label: "today",
    peakHeatIndexC: 30,
    levelLabel: "Caution",
    significant: false,
    danger: false,
    peakHour: "2 PM",
    ...overrides,
  });

  it("is silent below Extreme caution", () => {
    expect(heatAlert([day({}), day({ label: "tomorrow" })])).toBeNull();
  });

  it("names the first significant day", () => {
    expect(
      heatAlert([
        day({}),
        day({
          label: "tomorrow",
          peakHeatIndexC: 38.4,
          levelLabel: "Extreme caution",
          significant: true,
        }),
      ])
    ).toEqual({
      level: "warn",
      message: "Heat index up to 38°C tomorrow around 2 PM (Extreme caution).",
      type: "heat",
    });
  });

  it("is bad at Danger or above", () => {
    expect(
      heatAlert([day({ peakHeatIndexC: 44, levelLabel: "Danger", significant: true, danger: true })])
        ?.level
    ).toBe("bad");
  });
});

describe("heatDaysForAlert", () => {
  it("labels today and tomorrow and skips past days", async () => {
    const { heatDaysForAlert } = await import("@/lib/domain/weather");
    const days = heatDaysForAlert(
      [
        { date: "2026-10-15", maxTempC: 33, rainChancePct: 10, peakHeatIndexC: 45, peakHour: 13 },
        { date: "2026-10-16", maxTempC: 31, rainChancePct: 40, peakHeatIndexC: 30, peakHour: 12 },
        { date: "2026-10-17", maxTempC: 34, rainChancePct: 5, peakHeatIndexC: 43, peakHour: 14 },
        { date: "2026-10-18", maxTempC: 35, rainChancePct: 0, peakHeatIndexC: 50, peakHour: 14 },
      ],
      "2026-10-16"
    );
    expect(days.map((d) => d.label)).toEqual(["today", "tomorrow"]);
    expect(days[1]).toMatchObject({ significant: true, danger: true, peakHour: "2 PM" });
    expect(heatAlert(days)?.message).toBe("Heat index up to 43°C tomorrow around 2 PM (Danger).");
  });
});

describe("pickPlace", () => {
  // Trimmed from a real Open-Meteo response for "Lipa", countryCode=PH.
  const lipa = [
    { name: "Lipa", admin1: "Mimaropa", admin2: "Province of Marinduque", admin3: "Municipality of Santa Cruz", latitude: 13.48, longitude: 122.02 },
    { name: "Lipa", admin1: "Mimaropa", admin2: "Occidental Mindoro", admin3: "Municipality of Paluan", latitude: 13.42, longitude: 120.46 },
    { name: "Lipa City", admin1: "Calabarzon", admin2: "Province of Batangas", admin3: "Lipa City", population: 212287, latitude: 13.9411, longitude: 121.1631 },
  ];

  it("picks the result in the farm's province, not the first same-named place", async () => {
    const { pickPlace } = await import("@/lib/domain/weather");
    expect(pickPlace(lipa, "Batangas")).toEqual({
      latitude: 13.9411,
      longitude: 121.1631,
      label: "Lipa City, Batangas",
    });
  });

  it("is null when nothing is in that province", async () => {
    const { pickPlace } = await import("@/lib/domain/weather");
    expect(pickPlace(lipa, "Cebu")).toBeNull();
  });

  it("prefers the town over a same-named barangay", async () => {
    const { pickPlace } = await import("@/lib/domain/weather");
    const place = pickPlace(
      [
        { name: "San Jose", admin2: "Province of Batangas", admin3: "Lipa City", latitude: 1, longitude: 1 },
        { name: "San Jose", admin2: "Province of Batangas", population: 80000, latitude: 2, longitude: 2 },
      ],
      "Province of Batangas"
    );
    expect(place?.latitude).toBe(2);
  });
});

describe("describeWeatherCode", () => {
  it("maps WMO codes to a kind and a label", async () => {
    const { describeWeatherCode } = await import("@/lib/domain/weather");
    expect(describeWeatherCode(0)).toEqual({ kind: "clear", label: "Sunny" });
    expect(describeWeatherCode(2)?.kind).toBe("partly_cloudy");
    expect(describeWeatherCode(3)?.kind).toBe("cloudy");
    expect(describeWeatherCode(45)?.kind).toBe("fog");
    expect(describeWeatherCode(53)?.kind).toBe("drizzle");
    expect(describeWeatherCode(80)).toEqual({ kind: "rain", label: "Light Rain" });
    expect(describeWeatherCode(82)?.kind).toBe("heavy_rain");
    expect(describeWeatherCode(95)?.kind).toBe("thunderstorm");
  });

  it("is null for a missing or unknown code", async () => {
    const { describeWeatherCode } = await import("@/lib/domain/weather");
    expect(describeWeatherCode(null)).toBeNull();
    expect(describeWeatherCode(undefined)).toBeNull();
    expect(describeWeatherCode(42)).toBeNull();
  });
});

describe("updatedAgo", () => {
  const now = new Date("2026-10-17T06:00:00Z");
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it("reads naturally from minutes to days", async () => {
    const { updatedAgo } = await import("@/lib/domain/weather");
    expect(updatedAgo(ago(0), now)).toBe("Updated just now");
    expect(updatedAgo(ago(1), now)).toBe("Updated just now");
    expect(updatedAgo(ago(25), now)).toBe("Updated 25 min ago");
    expect(updatedAgo(ago(59), now)).toBe("Updated 59 min ago");
    expect(updatedAgo(ago(60), now)).toBe("Updated 1 hr ago");
    expect(updatedAgo(ago(5 * 60 + 30), now)).toBe("Updated 5 hr ago");
    expect(updatedAgo(ago(24 * 60), now)).toBe("Updated yesterday");
    expect(updatedAgo(ago(3 * 24 * 60), now)).toBe("Updated 3 days ago");
  });

  it("never goes negative when the clock is slightly behind", async () => {
    const { updatedAgo } = await import("@/lib/domain/weather");
    expect(updatedAgo(ago(-3), now)).toBe("Updated just now");
  });
});

describe("isCurrentReading", () => {
  const now = new Date("2026-10-17T06:00:00Z");
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it("is current through a normal hourly refresh, not after", async () => {
    const { isCurrentReading } = await import("@/lib/domain/weather");
    expect(isCurrentReading(ago(0), now)).toBe(true);
    expect(isCurrentReading(ago(60), now)).toBe(true);
    expect(isCurrentReading(ago(75), now)).toBe(true);
    expect(isCurrentReading(ago(76), now)).toBe(false);
    expect(isCurrentReading(ago(5 * 60), now)).toBe(false);
  });
});
