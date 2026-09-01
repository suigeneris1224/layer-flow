"use client";

import { useEffect, useState } from "react";

/**
 * `navigator.onLine`, kept live.
 *
 * Defaults to `true`: this renders on the server (where `navigator` doesn't
 * exist) and during the first client render before effects run, and treating
 * that window as "offline" would flash every form into offline mode on every
 * page load, which is worse than the rare case of a stale value for one tick.
 */
export function useConnectivity(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
