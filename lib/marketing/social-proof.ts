import type { PhotoKey } from "./photos";

/**
 * Real customer quotes and real people only -- never stock or AI-generated
 * faces. LayerFlow is currently one developer, so TEAM stays empty unless
 * someone real joins; the About page uses a workspace photo instead.
 *
 * Both lists are deliberately empty until there's something genuine to put
 * in them. While TESTIMONIALS is empty the homepage shows its "Made for Filipino farmers"
 * section instead (components/marketing/testimonial.tsx); while TEAM is empty
 * the About page's team grid renders nothing. A made-up quote
 * costs more trust than an absent one -- and Google's review-snippet
 * guidelines treat fabricated testimonials as spam.
 */
export interface Testimonial {
  quote: string;
  name: string;
  /** e.g. "Layer farmer, 1,200 hens" */
  role: string;
  /** e.g. "Liloan, Cebu" */
  location: string;
  photo?: PhotoKey;
}

export interface TeamMember {
  name: string;
  role: string;
  photo?: PhotoKey;
}

export const TESTIMONIALS: Testimonial[] = [];

export const TEAM: TeamMember[] = [];
