import type { FaqItem } from "@/components/marketing/faq-accordion";

/**
 * Every published FAQ answer, in one place. /faq renders all of it; the
 * homepage and How It Works pull a handful by question (pickFaq below), so
 * an answer can't say one thing on one page and something else on another.
 */
export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "General",
    items: [
      {
        question: "What is LayerFlow?",
        answer:
          "LayerFlow is farm operations software for layer farms: it tracks production, feed, sales, expenses, and profitability in one dashboard, instead of scattered notebooks and spreadsheets.",
      },
      {
        question: "Who is LayerFlow for?",
        answer:
          "Layer farms in the Philippines with roughly 100 to 5,000 hens — from a single-flock backyard operation to a multi-house commercial farm with staff.",
      },
      {
        question: "Can I use LayerFlow on my phone?",
        answer:
          "Yes, LayerFlow is built mobile-first: large touch targets, 16px inputs that don't trigger an iOS zoom, and a layout designed for a phone in a poultry house.",
      },
      {
        question: "Does LayerFlow work offline?",
        answer:
          "Yes, on the Starter plan and up — recording production, feed, and mortality keeps working with no signal. Your entry saves to your phone and syncs automatically once you're back online.",
      },
    ],
  },
  {
    title: "Plans & billing",
    items: [
      {
        question: "Can I start for free?",
        answer:
          "Yes. The Free plan covers one farm, one house, and one flock with 30 days of history — no card required.",
      },
      {
        question: "What do the paid plans cost?",
        answer:
          "Starter is ₱249/month (₱2,490/year) and Pro is ₱699/month (₱6,990/year) — the annual price on either plan works out to about two months free compared to paying monthly. See the Pricing page for exactly what each plan includes.",
      },
      {
        question: "How do I pay?",
        answer:
          "Billing is prepaid and manual right now — you transfer to our designated bank or e-wallet account and submit your reference number and proof of payment for review, usually processed within a business day. An automated online checkout (GCash, Maya, QR Ph, or cards via PayMongo) is coming soon. Either way, nothing is charged automatically without you initiating it.",
      },
      {
        question: "What happens if my subscription lapses?",
        answer:
          "You get a short grace period to renew before cloud sync and team features pause. Your local, on-device records are never touched — only the cloud side is affected, and only after non-payment. See our Terms for the exact timeline.",
      },
      {
        question: "Can I change plans later?",
        answer:
          "Yes, anytime. Changing plans never deletes your records — moving down just limits how much new data you can add until you move back up.",
      },
    ],
  },
  {
    title: "Features",
    items: [
      {
        question: "Can multiple people use one farm?",
        answer:
          "Yes, from the Pro plan. Invite up to ten teammates by role — worker, manager, or owner — so everyone sees the same numbers.",
      },
      {
        question: "Can I manage multiple farms?",
        answer:
          "Yes, on the Pro plan, with a Compare Farms view that shows revenue, cost, and profit side by side across every farm you run.",
      },
      {
        question: "Can I record feed cost by the sack?",
        answer:
          "Yes. Enter cost per kilo directly, or tell LayerFlow your sack size (25kg, 50kg, or a custom size) and price, and it works out the cost per kilo for you.",
      },
      {
        question: "Can I export my data?",
        answer:
          "Yes, on the Pro plan — pull your sales and expense records out as a CSV spreadsheet whenever you need them.",
      },
    ],
  },
  {
    title: "Data & security",
    items: [
      {
        question: "Is my farm data secure?",
        answer:
          "Your farm's data is isolated at the database level — no other farm can read it, including in shared infrastructure. See our Privacy Policy for the full detail.",
      },
      {
        question: "Who owns the data I enter?",
        answer:
          "You do, completely. We host and sync it so the app can function, but the records themselves — production, sales, expenses, everything — are yours.",
      },
      {
        question: "What happens to my data if I stop using LayerFlow?",
        answer:
          "Local, on-device records stay until you uninstall or clear the app yourself. Cloud records follow the retention timeline in our Privacy Policy, and we make a reasonable effort to notify you by email before anything is permanently removed.",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        question: "How do I get help?",
        answer:
          "Signed in, use Support right from the app — Pro plans get priority handling. Not signed in yet, or prefer email? Reach us on the Contact page.",
      },
      {
        question: "Where do I report a bug or request a feature?",
        answer:
          "The same place — Support in the app, or our Contact page. We read everything, even if we can't build every request.",
      },
    ],
  },
];

const ALL_ITEMS = FAQ_GROUPS.flatMap((group) => group.items);

/** The named questions, in the order given. Throws on a typo so a renamed question can't silently drop off a page. */
export function pickFaq(questions: readonly string[]): FaqItem[] {
  return questions.map((question) => {
    const item = ALL_ITEMS.find((candidate) => candidate.question === question);
    if (!item) throw new Error(`No FAQ item for "${question}"`);
    return item;
  });
}

/**
 * FAQPage structured data. Must mirror what's visibly published on the same
 * page -- pass it the exact items that page renders, never extra copy.
 */
export function faqSchema(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
