"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Wraps PublicHeader so it picks up a blurred surface once the page scrolls under it. */
export function StickyNavBlur({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-40 transition-colors",
        scrolled ? "border-b border-border bg-surface/80 backdrop-blur" : "border-b border-transparent"
      )}
    >
      {children}
    </div>
  );
}
