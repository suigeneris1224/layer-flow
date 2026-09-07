import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Terms",
  description: "LayerFlow's Terms & Conditions.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader title="Terms & Conditions" description="Last Updated: September 7, 2026" />

          <div className="mt-4 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              Please read these Terms &amp; Conditions (&quot;Terms&quot;) carefully and
              thoroughly before utilizing LayerFlow (the &quot;Service&quot;), a mobile-first,
              offline-capable software platform engineered specifically for egg layer and poultry
              farm management.
            </p>
            <p>
              By creating an account, installing the application, activating a trial, or
              processing a subscription payment, you explicitly acknowledge that you have read,
              understood, and agreed to be legally bound by these Terms. If you do not agree to
              these Terms in their entirety, you are strictly prohibited from accessing or using
              the Service.
            </p>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                1. Subscription Model, Fees, and System Access Control
              </h2>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">Prepaid Billing Framework:</span>{" "}
                  The Service operates strictly on a prepaid, manual subscription basis.
                  Subscriptions are made available across tiers structured around operational
                  capacity limits (such as the Starter Tier at ₱349/month or the Pro Tier at
                  ₱899/month, or their respective annual equivalents).
                </li>
                <li>
                  <span className="font-medium text-foreground">The Expiry Clock:</span> Your
                  continuous access to cloud features, team collaboration tools, and synchronized
                  metrics is tied directly to our central system&apos;s digital expiry clock. It
                  is your sole responsibility to execute your renewal payment before your active
                  billing cycle concludes.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Delinquency and The 3-Day Grace Period:
                  </span>{" "}
                  If your subscription is not renewed by the exact hour of expiration, your
                  account access will immediately enter a restricted phase. The system provides an
                  automated 3-day grace period during which local logging may function, but cloud
                  sync and multi-user configurations will freeze. Upon the conclusion of the 3-day
                  grace period, the application will automatically block access to the user
                  interface until a valid renewal invoice is settled.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    User-Initiated Transactions via PayMongo:
                  </span>{" "}
                  All regular subscription payments are completely user-initiated. Unless you
                  explicitly authorize a separate, specialized enterprise recurring billing
                  contract through a verified business payment channel, we do not execute
                  automated monthly credit card or e-wallet deductions. All digital transactions
                  are pushed manually by you via our integrated PayMongo checkout portal using
                  supported payment methods (GCash, Maya, QR Ph, or local credit cards).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                2. Intellectual Property Rights and Data Ownership
              </h2>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">
                    Proprietary Software Rights:
                  </span>{" "}
                  We retain absolute and exclusive ownership over all rights, titles, and
                  interests in and to the software platform, including its source code,
                  compilation mechanics, user interface designs, logo assets, feature workflows,
                  mathematical calculation algorithms, and all server-side configurations
                  associated with our Cloudflare and Supabase backends. You are granted a limited,
                  revocable, non-exclusive, non-transferable license to access the app solely for
                  your internal agricultural business operations.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Absolute Farm Data Ownership:
                  </span>{" "}
                  You retain complete and uncompromised legal ownership over all raw agricultural
                  metrics, livestock logs, mortality counts, feed inventory formulas, and
                  financial transaction records that you or your designated staff input into the
                  system.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Limited Data Hosting License:
                  </span>{" "}
                  To ensure the app can function, you hereby grant us a worldwide, royalty-free,
                  limited license to securely host, store, replicate, transmit, and backup your
                  farm data through our cloud infrastructure. This license is granted solely for
                  the functional purpose of providing the service, rendering statistical graphs,
                  and facilitating database syncs to your authorized devices.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                3. Exhaustive Limitation of Liability (Critical Risk Clause)
              </h2>
              <p className="mt-1">
                Poultry farming and egg production are high-risk business operations subject to
                unpredictable biological, environmental, and financial market factors. By using
                this software, you explicitly accept the following liability limits:
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">
                    &quot;As-Is&quot; and &quot;As-Available&quot; Software Baseline:
                  </span>{" "}
                  The Service is provided to you on an &quot;AS IS&quot; and &quot;AS
                  AVAILABLE&quot; basis. We do not warrant, guarantee, or represent that the
                  software platform will be 100% uninterrupted, completely error-free, or that
                  database synchronization will occur instantaneously under poor, unstable, or
                  non-existent cellular networks in rural areas.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Absolute Exclusion of Agricultural, Biological, and Financial Liability:
                  </span>{" "}
                  Under no circumstances shall we, our developers, founders, or affiliates, be
                  held legally liable to you or any third party for any direct, indirect,
                  accidental, special, punitive, or consequential financial damages resulting from
                  your use or inability to use the software. This exclusion explicitly covers, but
                  is not limited to:
                  <ul className="mt-2 flex flex-col gap-1.5 pl-5">
                    <li className="list-disc">
                      The death, illness, disease outbreak (such as Avian Influenza), or loss of
                      livestock, birds, pullets, or layers on your property.
                    </li>
                    <li className="list-disc">
                      Financial discrepancies, missed margins, or revenue losses stemming from
                      inaccuracies in Feed Conversion Ratio (FCR) calculations, egg-grading
                      distribution projections, or profit/loss forecasting logs.
                    </li>
                    <li className="list-disc">
                      Operational disruptions caused by device-level anomalies, including local
                      device time-tampering or offline multi-device synchronization data
                      overwrites.
                    </li>
                    <li className="list-disc">
                      Complete or partial data loss resulting from un-synchronized local database
                      corruption, physical mobile device damage, operating system crashes, or
                      unbacked-up device changes.
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Definitive Financial Liability Cap:
                  </span>{" "}
                  In any event where a competent court of law in the Philippines determines that
                  we are liable for a verified system malfunction, our maximum, aggregate, and
                  absolute financial liability to you for any and all claims shall never exceed
                  the total dollar or Peso amount of subscription fees you actually paid to us
                  during the three (3) months immediately preceding the specific event giving rise
                  to liability.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                4. User Responsibilities, Security, and Anti-Fraud Mandates
              </h2>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">
                    Prohibition of Local Time-Tampering:
                  </span>{" "}
                  Because this Service features deep offline functionality, account access relies
                  on internal device timestamps. You explicitly agree not to manipulate, alter,
                  roll back, or artificially advance your physical mobile device&apos;s system
                  clock, calendar settings, or localized storage mechanisms to bypass or extend
                  your subscription timeline. Our system features automated background security
                  mechanisms that scan for temporal inconsistencies. Any detected time-tampering
                  or unauthorized local database tampering will result in the immediate,
                  automatic, and permanent termination of your account and cloud records without
                  warning and without eligibility for a refund.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Multi-User Account Management Security:
                  </span>{" "}
                  If you are on the Pro Tier, you are permitted to provision up to ten (10)
                  distinct user seats for your farmhands, managers, and clerks. Each account must
                  be assigned to a unique physical individual. You are solely responsible for
                  maintaining the confidentiality of all login credentials authenticated through
                  Supabase. Any data deletion, modification, or error committed by your staff
                  within your multi-user environment is your sole operational and financial
                  responsibility.
                </li>
                <li>
                  <span className="font-medium text-foreground">Lawful Farm Use:</span> You agree
                  to use the platform exclusively for lawful agricultural operations and will not
                  utilize the data export or report features to generate fraudulent financial
                  records or misleading compliance data.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                5. Amendments and Service Changes
              </h2>
              <p className="mt-1">
                We reserve the right, at our sole discretion, to modify, update, or replace these
                Terms &amp; Conditions, as well as alter subscription pricing configurations, at
                any time to reflect changing technical infrastructure, economic factors, or legal
                updates in the SaaS industry. When changes occur, we will post notice directly
                within the application dashboard or send an update to your registered email
                address at least thirty (30) days before the new provisions take effect. Continued
                use of the app after an amendment constitutes full acceptance of the updated
                Terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                6. Governing Law and Exclusive Jurisdiction
              </h2>
              <p className="mt-1">
                These Terms, along with any operational disputes or claims arising out of their
                interpretation, shall be governed by, construed, and enforced exclusively in
                accordance with the laws of the Republic of the Philippines.
              </p>
              <p className="mt-2">
                Any legal actions, arbitration proceedings, or court litigations arising from or
                directly connected to the use of this software platform shall be filed exclusively
                in the proper courts of Cebu City, Philippines, to the exclusion of all other
                alternative venues.
              </p>
            </section>

            <p className="mt-1">
              See{" "}
              <a href="/privacy" className="text-primary hover:underline">
                our Privacy Policy
              </a>{" "}
              for how we collect, use, and protect your data.
            </p>
          </div>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
