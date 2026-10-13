import { Egg } from "lucide-react";
import { PHOTOS, type PhotoKey } from "@/lib/marketing/photos";
import { cn } from "@/lib/utils";

const RATIOS = {
  "4/3": "aspect-[4/3]",
  "16/10": "aspect-[16/10]",
  "16/9": "aspect-video",
  "3/2": "aspect-[3/2]",
  "1/1": "aspect-square",
} as const;

/**
 * A marketing photograph, or a branded placeholder until the real one is
 * supplied -- see lib/marketing/photos.ts for how to add one.
 *
 * A plain <img>, not next/image: Workers only resizes through a paid Images
 * binding this app doesn't have (same reason Brand uses `unoptimized`), so
 * next/image would add nothing but a wrapper. Explicit width/height keep the
 * aspect box reserved before load, so nothing shifts.
 */
export function PhotoSlot({
  photo,
  fallback,
  ratio = "4/3",
  priority = false,
  className,
  children,
}: {
  photo: PhotoKey;
  /**
   * Another slot to show until `photo`'s own file is supplied -- so a new
   * slot can ship with a real image instead of the placeholder panel.
   */
  fallback?: PhotoKey;
  ratio?: keyof typeof RATIOS;
  /** Above-the-fold hero image: load eagerly so it isn't the LCP bottleneck. */
  priority?: boolean;
  className?: string;
  /** Overlay content, e.g. a play button or a floating stat card. */
  children?: React.ReactNode;
}) {
  const chosen = !PHOTOS[photo].available && fallback && PHOTOS[fallback].available ? fallback : photo;
  const { src, alt, width, height, available } = PHOTOS[chosen];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-section",
        RATIOS[ratio],
        className
      )}
    >
      {available ? (
        // eslint-disable-next-line @next/next/no-img-element -- see the comment above
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        // Placeholder: decorative only, so screen readers skip it rather
        // than announce a description of a photo that isn't there.
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-chip-green via-section to-chip-amber/60"
          aria-hidden
        >
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-brand/10" />
          <div className="absolute -bottom-12 -left-8 size-48 rounded-full bg-primary/10" />
          <Egg className="relative size-10 text-primary/40" strokeWidth={1.5} />
        </div>
      )}
      {children}
    </div>
  );
}
