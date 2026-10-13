import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { PhotoSlot } from "@/components/marketing/photo-slot";
import { categoryLabel, type BlogPost } from "@/lib/blog/posts";

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow hover:shadow-pop">
      <PhotoSlot photo={post.photo} ratio="16/10" className="rounded-none border-0 border-b" />
      <div className="flex flex-1 flex-col p-5">
        <span className="self-start rounded-full bg-chip-green px-2 py-0.5 text-[11px] font-medium text-chip-green-fg">
          {categoryLabel(post.category)}
        </span>
        <h3 className="mt-3 font-semibold leading-snug text-foreground">
          {/* Stretched link: the whole card is clickable, one link in the tab order. */}
          <Link href={`/blog/${post.slug}` as Route} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.description}</p>
        <p className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-primary-strong">
          Read more
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </p>
      </div>
    </article>
  );
}
