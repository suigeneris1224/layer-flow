import Image from "next/image";
import logo from "@/public/icons/layerflow-logo.png";

/**
 * Wordmark plus tagline, used at the top of the sidebar and the drawer.
 *
 * The mark is imported rather than referenced by path so Next can size it at
 * build time and serve a resized, modern-format version -- the source file is
 * 1254px square and would otherwise ship in full for a 48px slot.
 *
 * It sits directly on the surface with no tile behind it: the PNG is genuinely
 * transparent, so on the light theme it reads as part of the sidebar. See the
 * note in docs/design-system.md about how it behaves on the dark theme.
 */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Sized to the height of the two text lines beside it, so the lockup
          reads as one block rather than a small mark with text hanging off it. */}
      <Image
        src={logo}
        alt=""
        width={48}
        height={48}
        priority
        className="size-12 shrink-0 object-contain"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold tracking-tight">LayerFlow</span>
        <span className="text-[11px] text-muted-foreground">Smart Poultry Management</span>
      </span>
    </div>
  );
}
