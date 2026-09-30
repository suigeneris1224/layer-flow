import type { WaitlistFlockSize } from "@/lib/types/database";

/**
 * Flock-size buckets for the paid-plan waitlist. Split around LayerFlow's
 * 100-5,000 hen target, so the answers tell the target market apart instead
 * of lumping most of it into one "under 2,000" bucket.
 */
export const WAITLIST_FLOCK_SIZES: readonly { value: WaitlistFlockSize; label: string }[] = [
  { value: "UNDER_500", label: "Under 500 hens" },
  { value: "FROM_500_TO_2000", label: "500 – 2,000 hens" },
  { value: "FROM_2000_TO_5000", label: "2,000 – 5,000 hens" },
  { value: "OVER_5000", label: "Over 5,000 hens" },
];

export function flockSizeLabel(value: WaitlistFlockSize): string {
  return WAITLIST_FLOCK_SIZES.find((option) => option.value === value)?.label ?? value;
}
