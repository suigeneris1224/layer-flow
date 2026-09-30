import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { OnboardingMockup } from "@/components/marketing/onboarding-mockup";
import { ProductionMockup } from "@/components/marketing/production-mockup";
import { InventoryMockup } from "@/components/marketing/inventory-mockup";
import { NotificationsMockup } from "@/components/marketing/notifications-mockup";
import { TeamMockup } from "@/components/marketing/team-mockup";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "A practical guide to running your farm in LayerFlow — from your first flock to your first report.",
};

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "daily-recording", title: "Recording your morning" },
  { id: "flock-health", title: "Flock health" },
  { id: "inventory-pricing", title: "Egg inventory and pricing" },
  { id: "sales", title: "Sales and customers" },
  { id: "expenses", title: "Expenses" },
  { id: "reports", title: "Dashboard, reports and analytics" },
  { id: "notifications", title: "Alerts and notifications" },
  { id: "team", title: "Team and roles" },
  { id: "offline", title: "Working offline" },
  { id: "billing", title: "Plans and billing" },
  { id: "help", title: "Getting help" },
] as const;

/**
 * Every visual on this page is a coded recreation of the real UI (same
 * technique as components/marketing/dashboard-mockup.tsx), never a
 * screenshot -- it stays accurate as the app evolves and never shows real
 * farm data. Not every section gets one; these are the screens a new farmer
 * benefits most from seeing.
 */
export default function DocsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell className="max-w-5xl py-10 lg:py-14">
          <PageHeader
            title="Documentation"
            description="A practical guide to running your farm in LayerFlow — from your first flock to your first report."
          />

          <div className="mt-8 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-10">
            {/* Desktop: sticky vertical sidebar. Mobile: horizontal pill strip. */}
            <nav
              aria-label="Sections"
              className="lg:sticky lg:top-20 lg:shrink-0"
            >
              <div className="relative">
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
                  {SECTIONS.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="shrink-0 whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground lg:whitespace-normal lg:border-0 lg:px-2 lg:py-1.5 lg:text-sm"
                    >
                      {section.title}
                    </a>
                  ))}
                </div>
                {/* Hints that the pill strip scrolls further -- only relevant while it's horizontal. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent lg:hidden"
                />
              </div>
            </nav>

            <div className="mt-6 flex min-w-0 flex-col gap-12 lg:mt-0">
              <section id="getting-started" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Getting started</h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-center">
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <p>
                      After you sign up and confirm your email, a short setup wizard walks you
                      through the minimum LayerFlow needs to start tracking your farm: your farm&apos;s
                      name and location, your first house, and your first flock — breed, how many
                      hens, and when they were placed. Five default egg sizes (Small through Jumbo)
                      and starting prices are created for you automatically; rename, reorder, or
                      disable any of them later from Prices.
                    </p>
                    <p>
                      You only go through this once per farm. Adding a second house or flock later
                      is a normal action from Houses or Flocks, not a repeat of onboarding.
                    </p>
                  </div>
                  <OnboardingMockup />
                </div>
              </section>

              <section id="daily-recording" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Recording your morning</h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-center">
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground lg:order-2">
                    <p>
                      Production is the one thing worth recording every single day. Open{" "}
                      <span className="font-medium text-foreground">Record Production</span> and
                      fill in, for one flock: eggs collected, how many were broken or dirty, the
                      breakdown by egg size, feed used, and any mortality — all in one form, one
                      submission per flock per day.
                    </p>
                    <p>
                      Recording the same day twice (say, a flaky connection made you tap Save
                      again) updates that one day&apos;s record rather than creating a duplicate. To
                      fix a mistake, open that day from Production history and edit it the same way
                      you created it — saving it again recalculates everything linked to that day
                      (its mortality and feed rows included).
                    </p>
                    <p>
                      Production history keeps every day you&apos;ve ever recorded on Starter and
                      Pro; on Free, history further back than 30 days isn&apos;t shown (the records
                      themselves are never deleted — they just come back into view if you upgrade).
                    </p>
                  </div>
                  <div className="lg:order-1">
                    <ProductionMockup />
                  </div>
                </div>
              </section>

              <section id="flock-health" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Flock health</h2>
                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    The <span className="font-medium text-foreground">Health</span> screen is for
                    mortality, feed, and vaccinations that happen{" "}
                    <span className="font-medium text-foreground">outside</span> a normal collection
                    day — an incident in the afternoon, a vaccination round that isn&apos;t tied to
                    this morning&apos;s count. A record you already entered through Production isn&apos;t
                    shown or editable here; open that day from Production instead, since saving it
                    again is what keeps it in sync.
                  </p>
                  <p>
                    Your flock&apos;s current hen count is never typed in by hand — it&apos;s always
                    the placement count minus everything logged as mortality, whether that came from
                    a daily record or from Health directly.
                  </p>
                </div>
              </section>

              <section id="inventory-pricing" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Egg inventory and pricing</h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-center">
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Inventory</span> shows what you
                      have on hand, by size — produced, sold, and adjusted, rolled up into trays and
                      loose eggs. If you see a note about eggs &ldquo;not sorted yet,&rdquo; that&apos;s eggs
                      you&apos;ve collected but haven&apos;t assigned to a size yet on that day&apos;s
                      record — they&apos;re real eggs in the shed, just not counted in the per-size
                      totals until you grade them. You can also record a manual adjustment
                      (spoilage, own use, a recount) with a reason, which the app keeps a record of.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Prices</span> is where you set
                      what each egg size sells for. A price change takes effect from a date you
                      choose — today, or a date in the future — and past sales always keep the price
                      that was in effect on the day they happened, even after you change prices
                      again.
                    </p>
                  </div>
                  <InventoryMockup />
                </div>
              </section>

              <section id="sales" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Sales and customers</h2>
                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    Record a sale by tray or by individual egg, to a customer you&apos;ve saved or a
                    walk-in, paid in full or with a part-payment against an outstanding balance. A
                    sale that would take a size below zero is allowed, not blocked — it&apos;s
                    treated as a sign your records are behind (a common case: selling before the
                    morning collection is entered), and Inventory shows the size in red until
                    it&apos;s corrected.
                  </p>
                  <p>
                    Customers lets you keep a simple list — name, contact info, and running balance
                    — instead of re-typing a name every time.
                  </p>
                </div>
              </section>

              <section id="expenses" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Expenses</h2>
                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    Record any farm expense against a category and, optionally, a specific flock.
                    One thing worth knowing: feed cost is already tracked through what you log under
                    Health/Production, so a Feed-category expense entered here is kept in your
                    expense list but isn&apos;t counted a second time in cost or profit totals —
                    recording it in both places would charge the farm twice for the same sacks.
                  </p>
                </div>
              </section>

              <section id="reports" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">
                  Dashboard, reports and analytics
                </h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-center">
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <p>
                      The Dashboard gives you today at a glance — eggs, sales, costs, and estimated
                      operating profit, each compared with yesterday. Analytics and Reports go
                      deeper: laying rate, feed cost per hen, egg-size distribution, and
                      revenue/cost/profit over a range you choose. Pro adds a cross-farm view if you
                      run more than one farm, so you can compare them side by side.
                    </p>
                  </div>
                  <DashboardMockup />
                </div>
              </section>

              <section id="notifications" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Alerts and notifications</h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-center">
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground lg:order-2">
                    <p>
                      LayerFlow watches your numbers and flags a handful of things worth knowing
                      about: production down from your recent average, mortality higher than usual,
                      a flock overdue for vaccination, and — on Pro — low inventory, an egg-size
                      shift, an underperforming flock, a flock running at a loss, and pricing that
                      hasn&apos;t been touched in a while. These show up as a badge on the bell icon
                      and on the Notifications page.
                    </p>
                    <p>
                      You can turn off a whole category (farm/production alerts, or inventory
                      alerts) from Settings → Notifications if it&apos;s not useful to you, and Pro
                      lets you adjust the specific thresholds that decide when each one fires.
                    </p>
                  </div>
                  <div className="lg:order-1">
                    <NotificationsMockup />
                  </div>
                </div>
              </section>

              <section id="team" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Team and roles</h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-center">
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <p>
                      From Settings → Team (Pro), invite someone with a shareable link — send it
                      however you already talk to them (Messenger, SMS, in person). They join once
                      they open it and sign in. Every person on a farm has one of three roles:{" "}
                      <span className="font-medium text-foreground">Worker</span> (records daily
                      production, feed, and mortality),{" "}
                      <span className="font-medium text-foreground">Manager</span> (the above, plus
                      flocks, houses, sales, expenses, pricing, and customers), and{" "}
                      <span className="font-medium text-foreground">Owner</span> (everything,
                      including team members and billing).
                    </p>
                    <p>
                      If you own more than one farm, a single invite can grant access to several of
                      them at once — you&apos;ll see a farm picker in the invite form when you have
                      more than one to choose from.
                    </p>
                  </div>
                  <TeamMockup />
                </div>
              </section>

              <section id="offline" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Working offline</h2>
                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    On Starter and up, recording production, feed, and mortality keeps working with
                    no signal at all — your entry is saved on your phone and a pending count stays
                    visible until it syncs, which happens automatically the moment you&apos;re back
                    online. If the very same day was also recorded from another device in the
                    meantime, LayerFlow never silently picks one over the other — it asks you to
                    review both versions and choose.
                  </p>
                </div>
              </section>

              <section id="billing" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Plans and billing</h2>
                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    Free, Starter, and Pro unlock progressively more — see the{" "}
                    <Link href="/pricing" className="text-primary hover:underline">
                      Pricing page
                    </Link>{" "}
                    for exactly what each includes. Downgrading never deletes anything; it only
                    limits how much new data you can add and how far back your history shows, until
                    you move back up.
                  </p>
                  <p>
                    Billing is prepaid and manual right now: you transfer to our designated bank or
                    e-wallet account and submit your reference number and proof of payment for
                    review, usually processed within a business day. An automated online checkout
                    (GCash, Maya, QR Ph, or cards) is coming soon. Either way, nothing is ever
                    charged automatically without you initiating it.
                  </p>
                </div>
              </section>

              <section id="help" className="scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Getting help</h2>
                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    Signed in, the fastest way to reach us is Support right in the app — Pro plans
                    get priority handling. Not signed in yet, or prefer email? Use the{" "}
                    <Link href="/contact" className="text-primary hover:underline">
                      Contact page
                    </Link>
                    . For quick answers, check the{" "}
                    <Link href="/faq" className="text-primary hover:underline">
                      FAQ
                    </Link>
                    .
                  </p>
                </div>
              </section>
            </div>
          </div>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
