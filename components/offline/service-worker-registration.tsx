"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js for app-shell caching (docs/offline-sync.md, step 6).
 *
 * Production only. Next dev's webpack/HMR rewrites _next/static content
 * constantly; a service worker caching it during development would mask live
 * edits behind stale cached chunks on every save -- the exact "stale shell
 * outliving a deploy" failure the doc warns about, just far more often.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort: a farmer with no service worker just gets no app-shell
      // caching, not a broken app -- the rest of the site works normally.
    });
  }, []);

  return null;
}
