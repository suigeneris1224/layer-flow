import { describe, expect, it } from "vitest";
import { placeLabel } from "@/lib/domain/geo";

describe("placeLabel", () => {
  it("names a barangay in a city with no province above it", () => {
    // Real Nominatim response for 10.333, 123.933.
    expect(placeLabel({ suburb: "Tipolo", city: "Mandaue" })).toBe("Tipolo, Mandaue");
  });

  it("adds the province when there is one", () => {
    // Real Nominatim response for 11.081, 123.937.
    expect(placeLabel({ quarter: "Poblacion", town: "San Remigio", state: "Cebu" })).toBe(
      "Poblacion, San Remigio, Cebu"
    );
  });

  it("skips a province that repeats the town", () => {
    expect(placeLabel({ village: "Lahug", city: "Cebu", state: "Cebu" })).toBe("Lahug, Cebu");
  });

  it("works with only a town", () => {
    expect(placeLabel({ municipality: "Sogod", province: "Cebu" })).toBe("Sogod, Cebu");
  });

  it("is null when there's nothing to name", () => {
    expect(placeLabel({ state: "Cebu" })).toBeNull();
    expect(placeLabel({})).toBeNull();
    expect(placeLabel(null)).toBeNull();
  });
});
