import Link from "next/link";
import { Brand } from "@/components/nav/brand";
import { Panel } from "@/components/ui/panel";

/**
 * Shell for login, signup, forgot- and reset-password.
 *
 * A soft brand wash behind a centered card, per docs/design-system.md's
 * "Panels only" rule -- the form used to sit unwrapped on the bare page
 * background. Single column at every width: a split-screen brand panel was
 * considered and deliberately skipped to keep this a small, low-risk change.
 *
 * The logo lives inside the card, not in a page header above it -- there is
 * no header at all, so the card is the first and only thing on the page.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-background" aria-hidden />

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Panel bodyClassName="p-6 sm:p-8">
            <Link href="/" className="mb-6 inline-flex w-fit">
              <Brand />
            </Link>
            {children}
          </Panel>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        Know your flock. Know your numbers.
      </footer>
    </div>
  );
}
