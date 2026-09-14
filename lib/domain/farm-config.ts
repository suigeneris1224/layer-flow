/**
 * Curated currency/timezone choices for Farm configuration
 * (app/(app)/settings/farm/farm-config-form.tsx).
 *
 * `farms.currency`/`farms.timezone` are free text with no DB constraint, but
 * both feed straight into `Intl` (lib/format.ts's `formatCurrency`,
 * `farmToday`/`farmHour`) -- an invalid code there fails silently or throws.
 * A short curated list is easier to get right than validating arbitrary
 * ISO-4217/IANA input, and this app's farms are overwhelmingly Philippine.
 */

export const SUPPORTED_CURRENCIES = [
  { code: "PHP", label: "Philippine Peso (₱)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
] as const;

export const SUPPORTED_TIMEZONES = [
  { id: "Asia/Manila", label: "Manila (Philippines)" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Asia/Hong_Kong", label: "Hong Kong" },
  { id: "Asia/Tokyo", label: "Tokyo" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "Australia/Sydney", label: "Sydney" },
  { id: "Europe/London", label: "London" },
  { id: "America/Los_Angeles", label: "Los Angeles" },
  { id: "America/New_York", label: "New York" },
] as const;
