"use client";

import { usePathname } from "next/navigation";

/**
 * Fades and lifts each route's content in on navigation, mobile only (see
 * the `.page-enter` rule in app/globals.css, scoped below `lg`).
 *
 * The key on pathname is what does the work: it forces React to remount the
 * wrapper on every navigation, which restarts the CSS animation for free --
 * no open/close state machine needed, unlike the quick-add sheet, since this
 * only ever "enters."
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
