import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Egg, HeartHandshake, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { PageHero } from "@/components/marketing/page-hero";
import { PhotoSlot } from "@/components/marketing/photo-slot";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { TEAM } from "@/lib/marketing/social-proof";
import { breadcrumbSchema, organizationSchema } from "@/lib/marketing/structured-data";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "LayerFlow is farm management software built for Philippine layer farmers, by a solo developer in Cebu working directly with poultry farms.";

export const metadata: Metadata = {
  title: "About — Built for Philippine Layer Farmers",
  description: DESCRIPTION,
  openGraph: { title: "About LayerFlow", description: DESCRIPTION, url: "/about" },
};

const FOCUS = [
  {
    icon: Egg,
    tint: "green" as const,
    title: "Layer farmers",
    copy: "Built for real farm operations with 100 to 5,000 hens — not adapted from a tool made for something else.",
  },
  {
    icon: Wrench,
    tint: "amber" as const,
    title: "Practical solutions",
    copy: "Simple, useful, and easy to adopt. A phone in the poultry house, not a desk in an office.",
  },
  {
    icon: HeartHandshake,
    tint: "teal" as const,
    title: "Long-term support",
    copy: "LayerFlow grows with your farm — and if a feature isn't built yet, it isn't promised.",
  },
];

export default function AboutPage() {
  return (
    <MarketingPage
      jsonLd={[
        organizationSchema(),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ]}
    >
      <PageHero
        eyebrow="About LayerFlow"
        title="Built for farmers, with farmers."
        lead="LayerFlow was created to help Philippine layer farmers manage their farms, increase visibility, and make better decisions with practical, easy-to-use software."
        actions={
          <Link href="#mission" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
            Our mission
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
        media={<PhotoSlot photo="aboutHero" priority className="shadow-pop" />}
      />

      <Section id="mission" className="scroll-mt-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="Why it exists" title="One question, every day: what did the flock actually earn?" />
          <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground lg:pt-8">
            <p>
              Farmers spend a lot of time and effort manually recording production, sales, and
              expenses. Egg counts live in one notebook, feed receipts in another, and sales
              somewhere else entirely — by the time anyone adds it up, the week is over.
            </p>
            <p>
              LayerFlow replaces the notebook, the group chat, and the scattered spreadsheets with
              one place to record daily egg production, feed and flock health, sales and customers,
              and expenses — then turns those numbers into reports, alerts, and an estimated
              operating profit you can actually trust.
            </p>
            <p>
              Recording works offline on paid plans, so a weak signal at the coop never costs you a
              day&apos;s numbers, and it&apos;s built for the Philippines by default — pesos, trays,
              and Philippine time, not a currency picker bolted onto a tool made for somewhere else.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="tint">
        <SectionHeading eyebrow="Our focus" title="What matters most." />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {FOCUS.map((item) => (
            <div key={item.title} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
              <IconChip icon={item.icon} tint={item.tint} size="lg" />
              <div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Who's behind it" title="Built by a solo developer in Cebu." />
            <div className="mt-5 flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
              <p>
                LayerFlow is designed, built, and supported by one developer based in Cebu, working
                directly with layer farmers to make software that fits how a farm actually runs.
              </p>
              <p>
                That means when you send feedback or ask for help, you&apos;re talking to the person
                who builds the product. It&apos;s early, and I say so: if a feature isn&apos;t built
                yet, you&apos;ll hear that plainly — and what farmers ask for decides what gets built
                next.
              </p>
            </div>
            <p className="mt-6 text-sm">
              <Link href="/contact" className="font-medium text-primary-strong hover:underline">
                Get in touch →
              </Link>
            </p>
          </div>
          <PhotoSlot photo="aboutFounder" ratio="16/10" className="shadow-card" />
        </div>

        {TEAM.length > 0 && (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member) => (
              <li key={member.name} className="flex flex-col gap-3">
                {member.photo && <PhotoSlot photo={member.photo} ratio="1/1" />}
                <div>
                  <p className="font-semibold text-foreground">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <CtaBand
        title="Ready to see LayerFlow in action?"
        lead="Start your free account and experience the difference."
        secondary={{ href: "/how-it-works", label: "See how it works" }}
      />
    </MarketingPage>
  );
}
