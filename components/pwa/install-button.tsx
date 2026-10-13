"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useInstall } from "./use-install";
import { cn } from "@/lib/utils";

/** Keep in sync with the sheet's `duration-*` class. */
const CLOSE_TRANSITION_MS = 320;

/**
 * "Install LayerFlow" row for the mobile menus (the app's MobileDrawer and the
 * public site's header menu). Renders nothing when installing isn't possible
 * or the app is already installed -- see lib/pwa/install.ts.
 *
 * - Chrome/Edge/Samsung: opens the browser's own install dialog.
 * - iOS Safari: opens a sheet with the Share -> Add to Home Screen steps,
 *   since iOS has no install API.
 * - iOS in-app browsers / Chrome on iOS: the same sheet, telling them to open
 *   the page in Safari first (only Safari can add to the home screen).
 */
export function InstallButton({ className }: { className?: string }) {
  const { mode, install } = useInstall();
  const [sheet, setSheet] = useState(false);

  if (mode === "hidden") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (mode === "prompt" ? void install() : setSheet(true))}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-lg border border-primary/25 bg-section px-3 py-2.5 text-left transition-colors hover:bg-chip-green",
          className
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Download className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">Install LayerFlow</span>
          <span className="block text-xs text-muted-foreground">
            Add to your home screen — opens like an app
          </span>
        </span>
      </button>

      {sheet && <IosInstallSheet inApp={mode === "ios-in-app"} onClose={() => setSheet(false)} />}
    </>
  );
}

function IosInstallSheet({ inApp, onClose }: { inApp: boolean; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  function hide() {
    setVisible(false);
    window.setTimeout(onClose, CLOSE_TRANSITION_MS);
  }

  useEffect(() => {
    // Two frames: paint off-screen first, then slide in -- same trick as
    // quick-add.tsx and mobile-drawer.tsx.
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // The drawer behind listens for Escape too; close only this sheet.
        event.stopImmediatePropagation();
        hide();
      }
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });

    // The drawer may already have locked scrolling -- restore whatever was there.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-sheet-title"
      className={cn(
        "fixed inset-0 z-[60] flex items-end transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
      // Portals bubble React events up the component tree, so a click here
      // would otherwise reach MobileDrawer's backdrop handler and close it.
      onClick={(event) => {
        event.stopPropagation();
        hide();
      }}
    >
      <div className="absolute inset-0 bg-foreground/40" />

      <div
        className={cn(
          "relative w-full rounded-t-2xl bg-surface p-5 pb-safe shadow-pop transition-transform duration-[320ms] ease-sheet",
          visible ? "translate-y-0" : "translate-y-full"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="install-sheet-title" className="text-lg font-semibold text-foreground">
            Install LayerFlow
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={hide}
            className="flex size-11 items-center justify-center rounded-md transition-colors hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {inApp ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This browser can&apos;t add apps to your home screen. Open this page in{" "}
            <strong className="text-foreground">Safari</strong> (tap ⋯ or the compass icon, then
            &ldquo;Open in Safari&rdquo;), then tap Install LayerFlow again.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Two taps, and LayerFlow opens from your home screen like an app.
            </p>
            <ol className="mt-5 flex flex-col gap-4">
              <Step number={1} icon={Share}>
                Tap the <strong className="text-foreground">Share</strong> button in Safari&apos;s
                toolbar.
              </Step>
              <Step number={2} icon={SquarePlus}>
                Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong>,
                then <strong className="text-foreground">Add</strong>.
              </Step>
            </ol>
          </>
        )}

        <button
          type="button"
          onClick={hide}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

function Step({
  number,
  icon: Icon,
  children,
}: {
  number: number;
  icon: typeof Share;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-chip-green text-chip-green-fg">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm text-muted-foreground">
        <span className="sr-only">Step {number}: </span>
        {children}
      </span>
    </li>
  );
}
