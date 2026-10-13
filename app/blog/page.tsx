import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { PageHero } from "@/components/marketing/page-hero";
import { PhotoSlot } from "@/components/marketing/photo-slot";
import { Section } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { PostCard } from "@/components/blog/post-card";
import { BLOG_CATEGORIES, POSTS, type BlogCategory } from "@/lib/blog/posts";
import { breadcrumbSchema } from "@/lib/marketing/structured-data";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "Practical guides for Philippine layer farmers: laying rate, cost per egg, feed costs, egg pricing by size, and reading your farm's profit.";

export const metadata: Metadata = {
  title: "Blog — Practical Guides for Layer Farmers",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: "LayerFlow Blog", description: DESCRIPTION, url: "/blog" },
};

/** Only categories that have at least one post -- an empty filter is a dead end. */
const ACTIVE_CATEGORIES = BLOG_CATEGORIES.filter((category) =>
  POSTS.some((post) => post.category === category.slug)
);

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = ACTIVE_CATEGORIES.find((c) => c.slug === category)?.slug as BlogCategory | undefined;
  const posts = active ? POSTS.filter((post) => post.category === active) : POSTS;

  return (
    <MarketingPage jsonLd={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])]}>
      <PageHero
        eyebrow="Blog & resources"
        title="Practical tips and guides for layer farmers."
        lead="Learn how to manage your flock, track production, control costs, and improve your farm's profitability."
        media={<PhotoSlot photo="blogHero" ratio="16/10" priority className="shadow-pop" />}
      />

      <Section innerClassName="pt-10 lg:pt-12">
        <nav aria-label="Categories" className="scroll-x-page -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <FilterPill href="/blog" active={!active}>
            All
          </FilterPill>
          {ACTIVE_CATEGORIES.map((c) => (
            <FilterPill key={c.slug} href={`/blog?category=${c.slug}`} active={active === c.slug}>
              {c.label}
            </FilterPill>
          ))}
        </nav>

        <h2 className="sr-only">Articles</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </Section>

      <CtaBand
        title="Put these numbers to work on your farm."
        lead="LayerFlow calculates laying rate, cost per egg, and operating profit for you."
        secondary={{ href: "/features", label: "See features" }}
      />
    </MarketingPage>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href as Route}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
