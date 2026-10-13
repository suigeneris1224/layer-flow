/**
 * "Install LayerFlow" -- one shared store for the PWA install prompt.
 *
 * Chrome/Edge/Samsung Internet fire `beforeinstallprompt` once, shortly after
 * page load -- usually before anyone has opened a menu -- so the event is
 * captured here at startup (components/pwa/install-listener.tsx) and handed
 * to whichever install button asks for it later. iOS Safari has no install
 * API at all; there the button shows "Share -> Add to Home Screen" steps
 * instead.
 *
 * Plain module state + subscribe/getSnapshot, for useSyncExternalStore --
 * no React here, so the platform detection below stays unit-testable.
 */

/** Not in TypeScript's DOM lib: it's a Chromium-only, non-standard event. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * - `prompt`: the browser can show its own install dialog.
 * - `ios`: Safari on iPhone/iPad -- show manual Add to Home Screen steps.
 * - `ios-in-app`: an in-app browser on iOS (Messenger, Facebook…), which
 *   can't add to the home screen at all -- tell them to open Safari.
 * - `hidden`: already installed, or this browser can't install.
 */
export type InstallMode = "prompt" | "ios" | "ios-in-app" | "hidden";

export interface PlatformInfo {
  userAgent: string;
  /** `navigator.maxTouchPoints` -- iPadOS reports a Mac user agent, but a Mac has no touch. */
  maxTouchPoints: number;
  standalone: boolean;
}

export function isIos({ userAgent, maxTouchPoints }: PlatformInfo): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

/** Facebook, Messenger, Instagram, LINE and similar wrap pages in their own webview. */
export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|TikTok/i.test(userAgent);
}

/**
 * Which kind of install button (if any) to show. `canPrompt` is whether a
 * `beforeinstallprompt` event has been captured.
 */
export function resolveInstallMode(platform: PlatformInfo, canPrompt: boolean): InstallMode {
  if (platform.standalone) return "hidden";
  if (canPrompt) return "prompt";
  if (isIos(platform)) {
    // On iOS only Safari itself can add to the home screen. Chrome/Firefox
    // on iOS (CriOS/FxiOS) can't, and neither can in-app webviews.
    if (isInAppBrowser(platform.userAgent) || /CriOS|FxiOS|EdgiOS/i.test(platform.userAgent)) {
      return "ios-in-app";
    }
    return "ios";
  }
  return "hidden";
}

// ---------------------------------------------------------------------------
// Browser-only store
// ---------------------------------------------------------------------------

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let attached = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readPlatform(): PlatformInfo {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone:
      installed ||
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's own flag for a home-screen launch.
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  };
}

/** Attach the global listeners. Idempotent; called once at startup. */
export function attachInstallListeners(): void {
  if (attached || typeof window === "undefined") return;
  attached = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop Chrome's own mini-infobar; our button shows the prompt instead.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): InstallMode {
  return resolveInstallMode(readPlatform(), deferred !== null);
}

/** Server render: never show the button, so hydration starts from the same markup. */
export function getServerSnapshot(): InstallMode {
  return "hidden";
}

/** Show the browser's install dialog. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  // A captured event can only be prompted once.
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}
