/**
 * Suggested opening prices per egg size, in PHP.
 *
 * These are a starting point shown in the onboarding form, never a hard-coded
 * price used in a calculation. Every farm stores its own prices in
 * `egg_prices`, and sales copy the price in force at sale time.
 */
export const DEFAULT_PRICES: Record<string, { perEgg: number; perTray: number }> = {
  SMALL: { perEgg: 5.5, perTray: 165 },
  MEDIUM: { perEgg: 6.0, perTray: 180 },
  LARGE: { perEgg: 7.0, perTray: 210 },
  EXTRA_LARGE: { perEgg: 7.5, perTray: 225 },
  JUMBO: { perEgg: 8.0, perTray: 240 },
};
