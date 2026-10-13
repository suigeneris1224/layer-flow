import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { PhotoSlot } from "@/components/marketing/photo-slot";
import { Section } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { PostCard } from "@/components/blog/post-card";
import { POST_BODIES } from "@/components/blog/posts";
import { POSTS, categoryLabel, formatPostDate, getPost, relatedPosts } from "@/lib/blog/posts";
import { PHOTOS } from "@/lib/marketing/photos";
import { articleSchema, breadcrumbSchema } from "@/lib/marketing/structured-data";

// No `dynamicParams = false`: on Cloudflare (OpenNext, no persistent
// incremental cache -- see open-next.config.ts) the prerendered HTML isn't
// found at request time, and dynamicParams=false turns that miss into a 404
// for every post. Rendering on demand is cheap, and unknown slugs still 404
// via notFound() below.
export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const path = `/blog/${post.slug}`;
  const photo = PHOTOS[post.photo];
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: path,
      siteName: "LayerFlow",
      locale: "en_PH",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified ?? post.datePublished,
      ...(photo.available && { images: [{ url: photo.src, width: photo.width, height: photo.height, alt: photo.alt }] }),
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const Body = POST_BODIES[slug];
  if (!post || !Body) notFound();

  const path = `/blog/${post.slug}`;
  const photo = PHOTOS[post.photo];

  return (
    <MarketingPage
      jsonLd={[
        articleSchema({
          title: post.title,
          description: post.description,
          path,
          datePublished: post.datePublished,
          dateModified: post.dateModified,
          image: photo.available ? photo.src : undefined,
        }),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ]),
      ]}
    >
      <article>
        <header className="bg-section">
          <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-8 lg:pt-12">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                <li>
                  <Link href="/blog" className="hover:text-primary-strong">
                    Blog
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronRight className="size-3.5" />
                </li>
                <li>
                  <Link
                    href={`/blog?category=${post.category}` as Route}
                    className="hover:text-primary-strong"
                  >
                    {categoryLabel(post.category)}
                  </Link>
                </li>
              </ol>
            </nav>

            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-[2.6rem]">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>

            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>LayerFlow team</span>
              <span aria-hidden>·</span>
              <time dateTime={post.datePublished}>{formatPostDate(post.datePublished)}</time>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                {post.readingMinutes} min read
              </span>
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl px-4">
          <PhotoSlot photo={post.photo} ratio="16/9" priority className="-mt-2 shadow-card" />
          <div className="py-10 lg:py-14">
            <Body />
          </div>
        </div>
      </article>

      <Section tone="tint">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Related articles</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {relatedPosts(post).map((related) => (
            <PostCard key={related.slug} post={related} />
          ))}
        </div>
      </Section>

      <CtaBand
        title="Stop calculating by hand."
        lead="LayerFlow works these numbers out from your daily records — free for one flock."
        secondary={{ href: "/how-it-works", label: "See how it works" }}
      />
    </MarketingPage>
  );
}
