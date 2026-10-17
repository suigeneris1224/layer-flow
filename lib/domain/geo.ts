/**
 * Turning a reverse-geocoded address into the short place name a farmer
 * recognises: "Tipolo, Mandaue" or "Poblacion, San Remigio, Cebu".
 *
 * OpenStreetMap tags a Philippine barangay inconsistently (quarter, suburb,
 * village...), and a highly urbanised city like Mandaue has no province above
 * it, so each level takes the first tag present. Pure module, no I/O.
 */

export interface ReverseAddress {
  quarter?: string;
  suburb?: string;
  village?: string;
  neighbourhood?: string;
  hamlet?: string;
  city?: string;
  town?: string;
  municipality?: string;
  state?: string;
  province?: string;
}

const first = (...values: (string | undefined)[]) =>
  values.map((value) => value?.trim()).find((value) => Boolean(value));

/** Null when there's neither a barangay nor a town to show. */
export function placeLabel(address: ReverseAddress | null | undefined): string | null {
  if (!address) return null;
  const barangay = first(
    address.quarter,
    address.suburb,
    address.village,
    address.neighbourhood,
    address.hamlet
  );
  const town = first(address.city, address.town, address.municipality);
  const province = first(address.state, address.province);
  if (!barangay && !town) return null;

  const parts = [barangay, town];
  if (province && province.toLowerCase() !== town?.toLowerCase()) parts.push(province);
  return parts.filter(Boolean).join(", ").slice(0, 200);
}
