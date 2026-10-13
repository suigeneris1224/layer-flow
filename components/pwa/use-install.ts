"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, promptInstall, subscribe } from "@/lib/pwa/install";

/** Which install button to show, and the action for the native-prompt case. */
export function useInstall() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { mode, install: promptInstall };
}
