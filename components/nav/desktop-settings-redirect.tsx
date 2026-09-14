"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Bare /settings has no content of its own on tablet/desktop -- the tab bar
 * (app/(app)/settings/layout.tsx, visible at md: and up) is the real nav
 * there, so landing on the hub defaults straight into Profile instead of
 * showing the mobile-only card grid. There's no server-side way to branch on
 * viewport width, so this fires the redirect client-side; mobile never
 * matches the media query and just sees the grid untouched.
 */
export function DesktopSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      router.replace("/settings/profile");
    }
  }, [router]);

  return null;
}
