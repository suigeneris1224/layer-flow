import Image from "next/image";
import logo from "@/public/icons/layerflow-logo.png";
import { cn } from "@/lib/utils";

/**
 * Wordmark plus tagline, used at the top of the sidebar and the drawer.
 *
 * The mark is imported (not path-referenced) so Next knows its intrinsic
 * size at build time; `unoptimized` since Workers only resizes `<Image>`
 * through a paid Images binding this app doesn't have. Not `priority` --
 * it's often off-screen at load (sidebar hidden below `lg`, footer below the
 * fold) and never the LCP element, so preloading it just warns unused.
 */
export function Brand({
  compact = false,
  size = "default",
}: { compact?: boolean; size?: "default" | "lg" } = {}) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Sized to the height of the two text lines beside it, so the lockup
          reads as one block rather than a small mark with text hanging off it.
          `compact` drops to a single line's height instead -- for a slim
          utility bar (app/admin/) where the full lockup has no room, not the
          main marketing/auth surfaces this component was designed for.
          `size="lg"` scales the whole lockup up -- for the auth card, which
          has room to let the logo lead instead of sitting at sidebar scale. */}
      <Image
        src={logo}
        alt=""
        width={size === "lg" ? 64 : 48}
        height={size === "lg" ? 64 : 48}
        unoptimized
        className={cn(
          "shrink-0 object-contain",
          compact ? "size-8" : size === "lg" ? "size-16" : "size-12"
        )}
      />
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-extrabold tracking-tight",
            size === "lg" ? "text-2xl" : "text-base"
          )}
        >
          LayerFlow
        </span>
        {!compact && (
          <span
            className={cn(
              "text-muted-foreground",
              size === "lg" ? "text-sm" : "text-[11px]"
            )}
          >
            Smart Poultry Management
          </span>
        )}
      </span>
    </div>
  );
}
