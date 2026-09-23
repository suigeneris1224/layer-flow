"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "layerflow-greeting-waved";

/**
 * Waves once per sign-in, not on every page navigation -- the greeting sits
 * in the topbar and renders on every route, so animating it unconditionally
 * would replay on every click. sessionStorage means it waves again the next
 * time someone signs back in, not just once ever on the device.
 */
export function GreetingWave() {
  const [waving, setWaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, "1");
      setWaving(true);
    } catch {
      // Private browsing or storage disabled -- just skip the animation,
      // never break the greeting itself.
    }
  }, []);

  return (
    <span aria-hidden className={waving ? "greeting-wave" : undefined}>
      👋
    </span>
  );
}
