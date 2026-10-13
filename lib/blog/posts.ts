import type { PhotoKey } from "@/lib/marketing/photos";

/**
 * Blog post metadata -- the index, sitemap, and each post's <head> all read
 * from here. Bodies live in components/blog/posts/, keyed by slug.
 *
 * To add a post: add its entry here (newest first), add its body component,
 * and register it in components/blog/posts/index.ts. The sitemap and robots
 * pick it up automatically.
 */
export const BLOG_CATEGORIES = [
  { slug: "production", label: "Production" },
  { slug: "feed", label: "Feed & Nutrition" },
  { slug: "sales", label: "Sales" },
  { slug: "finance", label: "Finance" },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]["slug"];

export interface BlogPost {
  slug: string;
  title: string;
  /** Meta description and card summary -- aim for 140-160 characters. */
  description: string;
  category: BlogCategory;
  /** ISO date, YYYY-MM-DD. */
  datePublished: string;
  dateModified?: string;
  readingMinutes: number;
  photo: PhotoKey;
}

export const POSTS: BlogPost[] = [
  {
    slug: "how-to-calculate-laying-rate",
    title: "How to Calculate Laying Rate (Hen-Day Egg Production)",
    description:
      "The laying rate formula, a worked example, what a healthy rate looks like across a flock's life, and the early warning signs worth acting on.",
    category: "production",
    datePublished: "2026-10-13",
    readingMinutes: 5,
    photo: "blogLayingRate",
  },
  {
    slug: "how-to-calculate-cost-per-egg",
    title: "How to Calculate Your Cost per Egg and Cost per Tray",
    description:
      "Work out what each egg and each 30-egg tray really costs your layer farm, which expenses to include, and how to use the number when you set prices.",
    category: "finance",
    datePublished: "2026-10-13",
    readingMinutes: 6,
    photo: "blogCostPerEgg",
  },
  {
    slug: "how-to-track-feed-costs-by-the-sack",
    title: "How to Track Layer Feed Costs When You Buy by the Sack",
    description:
      "Turn sack prices into cost per kilo, track feed per hen per day, and spot waste early — feed is the biggest cost on most layer farms.",
    category: "feed",
    datePublished: "2026-10-13",
    readingMinutes: 5,
    photo: "blogFeedCost",
  },
  {
    slug: "pricing-eggs-by-size-and-tray",
    title: "Pricing Eggs by Size and by the Tray: A Practical Guide",
    description:
      "Why eggs are sold by size in the Philippines, how to sort and record them, and how to set tray prices that cover your costs for every size.",
    category: "sales",
    datePublished: "2026-10-13",
    readingMinutes: 6,
    photo: "blogEggSizes",
  },
  {
    slug: "reading-your-farms-operating-profit",
    title: "Reading Your Farm's Estimated Operating Profit",
    description:
      "What estimated operating profit includes, what it leaves out, and how to read it month to month so you know whether your layer farm is really earning.",
    category: "finance",
    datePublished: "2026-10-13",
    readingMinutes: 5,
    photo: "blogOperatingProfit",
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}

export function categoryLabel(slug: BlogCategory): string {
  return BLOG_CATEGORIES.find((category) => category.slug === slug)?.label ?? slug;
}

/** Up to `count` other posts, same category first. */
export function relatedPosts(post: BlogPost, count = 3): BlogPost[] {
  const others = POSTS.filter((candidate) => candidate.slug !== post.slug);
  const same = others.filter((candidate) => candidate.category === post.category);
  const rest = others.filter((candidate) => candidate.category !== post.category);
  return [...same, ...rest].slice(0, count);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}
