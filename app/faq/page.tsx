import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { FaqAccordion, type FaqItem } from "@/components/marketing/faq-accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about LayerFlow — plans, features, data, and support.",
};

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const GROUPS: FaqGroup[] = [
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
          "Yes, on the Starter plan and up. Recording keeps working through a weak signal and syncs your records automatically once you're back online.",
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
          "Starter is ₱349/month (₱3,490/year) and Pro is ₱899/month (₱8,990/year) — the annual price on either plan works out to about two months free compared to paying monthly. See the Pricing page for exactly what each plan includes.",
      },
      {
        question: "How do I pay?",
        answer:
          "Billing is prepaid and manual — you renew when you're ready, through our PayMongo checkout (GCash, Maya, QR Ph, or local cards). Nothing is charged automatically without you initiating it.",
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

export default function FaqPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader
            title="Frequently asked questions"
            description="Plans, features, data, and support — the short answers."
          />

          <div className="mt-6 flex flex-col gap-10">
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h2 className="text-base font-semibold text-foreground">{group.title}</h2>
                <div className="mt-3">
                  <FaqAccordion items={group.items} />
                </div>
              </section>
            ))}
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Still have a question?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>{" "}
            and we&apos;ll get back to you.
          </p>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
