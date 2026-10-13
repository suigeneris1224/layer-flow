/**
 * Every photograph the marketing site has a slot for.
 *
 * The site ships before the photos do: a slot whose `available` is false
 * renders a branded placeholder panel (components/marketing/photo-slot.tsx)
 * instead of a broken image. To add one, drop the file at `src` under
 * public/ -- ideally a JPEG or WebP at the listed size, under ~250 KB -- and
 * flip `available` to true. Nothing else changes.
 *
 * Sizes are capped at 1200 wide on purpose: that's still 2x the widest
 * these render (~600px), and every slot can be cropped from a 1536x1024
 * image -- free ChatGPT's only landscape output -- without upscaling.
 *
 * Alt text is written now, not later, so it's never left empty when the
 * photo lands. It should still be corrected to describe the actual photo.
 */
export interface Photo {
  src: string;
  alt: string;
  width: number;
  height: number;
  available: boolean;
}

/** The last argument is `available` -- keep every slot as a single photo(...) call, since scripts/optimize-marketing-photos.mjs reads slot sizes by that shape. */
function photo(name: string, alt: string, width: number, height: number, available = false): Photo {
  return { src: `/marketing/${name}`, alt, width, height, available };
}

export const PHOTOS = {
  homeTestimonial: photo(
    "home-testimonial.jpg",
    "A layer farmer standing among her hens in a poultry house",
    1200,
    900
  ),
  // The homepage's "Built in Cebu" section, shown until a real testimonial
  // exists (falls back to howItWorksHero if this file is ever removed).
  homeFarm: photo(
    "home-farm.jpg",
    "A long open-sided layer house with white hens and stacked egg trays, surrounded by coconut palms and hills in the Cebu countryside",
    1152,
    648,
    true
  ),
  featuresHero: photo(
    "features-hero.jpg",
    "A Filipino woman farmer checking her phone beside a tray of white eggs in a layer house with white hens",
    1200,
    900,
    true
  ),
  // 1024 wide, not 1200: the Gemini source is 1024x572, and cropping beats upscaling.
  howItWorksHero: photo(
    "how-it-works-hero.jpg",
    "A farmer in a bucket hat recording on her phone in the aisle of an open-sided layer house with white hens",
    1024,
    640,
    true
  ),
  pricingHero: photo(
    "pricing-hero.jpg",
    "A smiling Filipino farmer holding a full 30-egg tray of white eggs outside his layer house",
    1200,
    900,
    true
  ),
  aboutHero: photo(
    "about-hero.jpg",
    "A young Filipino farmer smiling as he holds a white laying hen inside a layer house",
    1200,
    900,
    true
  ),
  // The real developer behind LayerFlow (an AI scene built from their own
  // photo) -- never a stock or stranger's face. See lib/marketing/social-proof.ts.
  aboutFounder: photo(
    "about-founder.jpg",
    "LayerFlow's developer working on a laptop at a farmhouse table, a tray of eggs beside it and a layer house with white hens behind",
    1152,
    648,
    true
  ),
  blogHero: photo(
    "blog-hero.jpg",
    "White laying hens with red combs looking out of their wire cages in a poultry house",
    1200,
    675,
    true
  ),
  // Blog images are 1152x648 (16:9) -- the same shape as Gemini's 1376x768 output, so nothing is
  // cropped off the sides (the pages show them at 16:10 and 16:9) and nothing is upscaled.
  blogLayingRate: photo(
    "blog-laying-rate.jpg",
    "A tray of freshly collected white eggs on a cage ledge, with a white laying hen behind it",
    1152,
    648,
    true
  ),
  blogCostPerEgg: photo(
    "blog-cost-per-egg.jpg",
    "Stacked trays of white eggs, an open record book and a calculator on a wooden table by a window",
    1152,
    648,
    true
  ),
  blogFeedCost: photo(
    "blog-feed-cost.jpg",
    "Sacks of layer feed stacked on wooden pallets, one open with a metal scoop, white hens in cages behind",
    1152,
    648,
    true
  ),
  blogEggSizes: photo(
    "blog-egg-sizes.jpg",
    "Four trays of white eggs laid out side by side on a wooden table",
    1152,
    648,
    true
  ),
  blogOperatingProfit: photo(
    "blog-operating-profit.jpg",
    "A woman farmer working on a laptop at a wooden table on a farmhouse porch, a layer house with white hens behind her",
    1152,
    648,
    true
  ),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;
