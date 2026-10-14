import Link from "next/link";
import { Calculator, MessageSquareHeart, Quote, ShieldCheck } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import { TESTIMONIALS } from "@/lib/marketing/social-proof";
import { PhotoSlot } from "./photo-slot";
import { Section, SectionHeading } from "./section";

/**
 * The homepage's social-proof spot.
 *
 * With a real testimonial in lib/marketing/social-proof.ts, it shows that
 * quote beside its photo ("Trusted by layer farmers"). Until then it shows
 * MadeForFilipinoFarmers instead -- commitments that are true today, rather than an
 * empty gap or a made-up quote. Adding the first testimonial swaps them
 * over with no other change.
 */
export function TestimonialSection() {
  const testimonial = TESTIMONIALS[0];
  if (!testimonial) return <MadeForFilipinoFarmers />;

  return (
    <Section>
      <div className="grid gap-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-card lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <SectionHeading eyebrow="Trusted by layer farmers" title="Real farms, real numbers." />
          <figure className="mt-6">
            <Quote className="size-8 text-brand" aria-hidden />
            <blockquote className="mt-3 text-lg leading-relaxed text-foreground">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 text-sm">
              <span className="font-semibold text-foreground">{testimonial.name}</span>
              <span className="block text-muted-foreground">
                {testimonial.role} · {testimonial.location}
              </span>
            </figcaption>
          </figure>
        </div>
        {testimonial.photo && (
          <PhotoSlot photo={testimonial.photo} className="rounded-none border-0 lg:aspect-auto lg:h-full" />
        )}
      </div>
    </Section>
  );
}

const COMMITMENTS = [
  {
    icon: Calculator,
    tint: "green" as const,
    title: "No black-box numbers",
    copy: "Every figure comes from a simple, published formula you can check yourself.",
  },
  {
    icon: ShieldCheck,
    tint: "teal" as const,
    title: "Your data is yours",
    copy: "Your records belong to you, and no other farm can ever see them.",
  },
  {
    icon: MessageSquareHeart,
    tint: "amber" as const,
    title: "Built with farmer feedback",
    copy: "What farmers ask for decides what gets built next.",
  },
];

function MadeForFilipinoFarmers() {
  return (
    <Section>
      <div className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-card lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <SectionHeading
            eyebrow="Made for Filipino farmers"
            title="Built for Philippine layer farms, not adapted for them."
          />
          <ul className="mt-8 flex flex-col gap-5">
            {COMMITMENTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <IconChip icon={item.icon} tint={item.tint} />
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm">
            <Link href="/contact" className="font-medium text-primary-strong hover:underline">
              Share your feedback →
            </Link>
          </p>
        </div>
        <PhotoSlot
          photo="homeFarm"
          fallback="howItWorksHero"
          ratio="16/10"
          className="rounded-none border-0 lg:aspect-auto lg:h-full"
        />
      </div>
    </Section>
  );
}
