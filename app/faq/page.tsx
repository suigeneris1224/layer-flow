import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { SectionHeading } from "@/components/marketing/section";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_GROUPS, faqSchema } from "@/lib/marketing/faq";
import { breadcrumbSchema } from "@/lib/marketing/structured-data";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about LayerFlow — pricing, payment, offline use, multiple farms, data security, and support for layer farms.",
};

export default function FaqPage() {
  return (
    <MarketingPage
      jsonLd={[
        faqSchema(FAQ_GROUPS.flatMap((group) => group.items)),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ]),
      ]}
    >
      <section className="bg-section">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:py-16">
          <SectionHeading
            as="h1"
            eyebrow="FAQ"
            title="Frequently asked questions"
            lead="Plans, features, data, and support — the short answers."
          />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12">
        {FAQ_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{group.title}</h2>
            <div className="mt-3">
              <FaqAccordion items={group.items} />
            </div>
          </section>
        ))}

        <p className="text-sm text-muted-foreground">
          Still have a question?{" "}
          <Link href="/contact" className="font-medium text-primary-strong hover:underline">
            Contact us
          </Link>{" "}
          and we&apos;ll get back to you.
        </p>
      </div>
    </MarketingPage>
  );
}
