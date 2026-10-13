"use client";

import { useEffect } from "react";
import { attachInstallListeners } from "@/lib/pwa/install";

// Attach as soon as this chunk loads in the browser, not only after hydration:
// `beforeinstallprompt` fires once, early, and on a slow phone it can beat
// React's first effect. attachInstallListeners() is idempotent.
if (typeof window !== "undefined") attachInstallListeners();

/**
 * Captures `beforeinstallprompt` at startup, on every page -- usually before
 * any install button has rendered. Mounted in app/layout.tsx beside
 * ServiceWorkerRegistration. See lib/pwa/install.ts.
 */
export function InstallListener() {
  useEffect(() => {
    attachInstallListeners();
  }, []);

  return null;
}
