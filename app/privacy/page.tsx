import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

const SUPPORT_EMAIL = "support@getlayerflow.com";

export const metadata: Metadata = {
  title: "Privacy",
  description: "LayerFlow's Privacy Policy, compliant with the Philippine Data Privacy Act of 2012.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main" className="flex-1">
        <PageShell width="reading" className="py-10 lg:py-14">
          <PageHeader title="Privacy Policy" description="Last Updated: September 23, 2026" />

          <div className="mt-4 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              Welcome to LayerFlow (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are
              deeply committed to protecting the privacy, security, and integrity of the data
              belonging to our users (&quot;you,&quot; &quot;your&quot;), specifically
              agricultural operators, livestock managers, and layer poultry farmers.
            </p>
            <p>
              This Privacy Policy governs your use of our mobile-first, offline-capable software
              platform (the &quot;Service&quot;) and details how we collect, process, utilize,
              share, and safeguard your personal and operational information. This document has
              been constructed in strict compliance with Republic Act No. 10173, otherwise known
              as the Data Privacy Act of 2012 (DPA) of the Republic of the Philippines, along with
              its Implementing Rules and Regulations (IRR).
            </p>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                1. Declaration of Principles
              </h2>
              <p className="mt-1">
                We process all personal and operational data entrusted to us with adherence to
                the core principles of transparency, legitimate purpose, and proportionality. We
                collect data solely to provide, optimize, secure, and maintain our agricultural
                management services, ensuring you maintain maximum control over your business
                records.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                2. Information We Collect and Process
              </h2>
              <p className="mt-1">
                To provide an optimized poultry management experience, we collect several
                categories of information:
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">
                    Account &amp; Registration Information:
                  </span>{" "}
                  When you create an account, register a subscription plan, or request technical
                  support, we collect personal information which may include your full name,
                  business name, active email address, mobile phone number, and physical farm
                  coordinates or location details.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Agricultural, Livestock, &amp; Operational Data:
                  </span>{" "}
                  Our platform operates by processing the metrics you or your authorized farm
                  staff log into the system. This includes, but is not limited to: daily egg
                  collection numbers, layout performance percentages, bird mortality counts, feed
                  inventory levels, veterinary/vaccination logs, sales receipts, expense
                  line-items, and overall financial ledgers. This data is handled in two ways:
                  <ul className="mt-2 flex flex-col gap-1.5 pl-5">
                    <li className="list-disc">
                      <span className="font-medium text-foreground">Locally:</span> Stored
                      securely within your mobile device&apos;s sandboxed local database to
                      facilitate seamless offline functionality.
                    </li>
                    <li className="list-disc">
                      <span className="font-medium text-foreground">Cloud Synchronization:</span>{" "}
                      Encrypted and synchronized automatically to our secure cloud database
                      infrastructure when a network connection becomes available.
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Team &amp; Multi-User Management Data:
                  </span>{" "}
                  For subscription tiers that support multi-user teams (e.g., up to 10 user
                  accounts on the Pro Tier), we collect the names, email addresses, and designated
                  access roles (e.g., Farmhand, Supervisor, Accountant) of your authorized
                  personnel to facilitate secure account access control.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Payment Verification Data (Current — Manual Transfer):
                  </span>{" "}
                  While our automated online checkout is not yet available, subscription payments
                  are made via manual bank/e-wallet transfer. To verify these payments, we collect
                  the payer name you provide, your payment reference number, and the
                  proof-of-payment file (receipt or screenshot) you upload. This file is stored in
                  our access-controlled cloud storage and is only viewable by authorized LayerFlow
                  staff reviewing your payment, via a temporary, expiring link — never a public
                  URL. We do not ask for, and you should never send us, your e-wallet PIN, mobile
                  banking password, or full card number; only the transaction receipt itself is
                  needed.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Third-Party Payment Processing Data (Once Pay Online Is Enabled):
                  </span>{" "}
                  When our automated online checkout via PayMongo becomes available, transactions
                  made through that channel will be handled exclusively by PayMongo. We will not
                  store, process, or transmit your credit card numbers, banking credentials, or
                  e-wallet PINs on our servers for that flow, and those transactions will be
                  governed by PayMongo&apos;s own privacy policy and PCI-DSS compliant
                  infrastructure.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                3. How We Use Your Information
              </h2>
              <p className="mt-1">
                The information we collect is utilized strictly for the following operational and
                legitimate business activities:
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">Core Service Delivery:</span> To
                  operate, maintain, update, and properly sync your local device database with our
                  cloud infrastructure.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Subscription &amp; Identity Verification:
                  </span>{" "}
                  To validate your active subscription tier (Free, Starter, or Pro) and
                  cross-reference your app status with our system&apos;s automated expiry clock.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    System Alerts &amp; Communication:
                  </span>{" "}
                  To transmit transactional receipts, automated system alerts, critical
                  maintenance announcements, or data-driven poultry health insights via SMS, push
                  notifications, or email.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Technical Support &amp; Troubleshooting:
                  </span>{" "}
                  To diagnose local data synchronization conflicts, resolve database corruption
                  errors, and assist you with data recovery requests.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Aggregated, Anonymized Analytics:
                  </span>{" "}
                  We reserve the right to compile anonymized, non-identifiable, and aggregated
                  agricultural metrics (such as broad provincial egg production trends or average
                  layer flock conversion rates) across the industry for research and platform
                  optimization. This data will never contain personal identifiers or proprietary
                  financial details linked to your specific farm business.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                4. Data Storage, Architecture, and Edge Security
              </h2>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">
                    Edge Networking and Infrastructure:
                  </span>{" "}
                  Cloud-synchronized data is transmitted using industry-standard Secure Socket
                  Layer/Transport Layer Security (SSL/TLS) encryption protocols through
                  Cloudflare&apos;s secure edge networks to our Supabase database architecture.
                </li>
                <li>
                  <span className="font-medium text-foreground">Local Device Encryption:</span>{" "}
                  Operational data stored on your physical mobile device relies on the native
                  encryption mechanisms provided by your device&apos;s operating system
                  (Android/iOS). You are responsible for ensuring your physical device is secured
                  with appropriate lock-screen security (PIN, biometrics) to prevent unauthorized
                  local exposure.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Data Retention and Lifecycle:
                  </span>{" "}
                  We retain your operational data on our active servers for as long as your
                  subscription account remains active.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Payment Verification Document Security:
                  </span>{" "}
                  Proof-of-payment files you submit are stored in access-controlled cloud storage,
                  separate from public assets, and are only ever accessible through short-lived,
                  expiring links generated for an authorized reviewer — never a permanent or
                  public URL.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                5. Recovery, Delinquency, and Archival Policies
              </h2>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">Billing Grace Period:</span> If
                  your prepaid subscription expires, your account enters a 3-day grace period
                  during which local logging may continue but cloud sync and multi-user access are
                  restricted, consistent with our Terms &amp; Conditions. Your data is not deleted
                  during this period or at any point afterward due to non-payment alone — an
                  unpaid or inactive account&apos;s data remains stored, with cloud access
                  restricted, until you either resume your subscription or request account
                  deletion as described below.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Account Deletion (User-Requested, Admin-Reviewed):
                  </span>{" "}
                  We do not automatically delete accounts or data based on inactivity or
                  non-payment. To permanently delete your account and all associated farm data,
                  you must submit a deletion request from Settings. An administrator reviews each
                  request, typically within a few days, before it is carried out. Your account and
                  data remain fully intact and usable while a request is pending. Once approved,
                  deletion is immediate and permanent, and cannot be undone. Payment verification
                  records are retained per the schedule below, independent of this process.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Payment Verification Records:
                  </span>{" "}
                  We retain submitted payment reference numbers and proof-of-payment files for
                  the lifetime of your account plus three (3) years thereafter, to support
                  accounting, fraud prevention, and dispute resolution, after which they are
                  permanently deleted in accordance with our standard data retention schedule.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                6. Data Breach Protocols &amp; Notification
              </h2>
              <p className="mt-1">
                In compliance with the circulars issued by the National Privacy Commission (NPC)
                of the Philippines, we maintain strict technical safeguards to detect and manage
                data security incidents. In the highly unlikely event of a verified data breach
                affecting your personal information, we will notify the NPC and all impacted
                users within seventy-two (72) hours of discovery, provided such breach is likely
                to give rise to a real risk of identity theft or data manipulation.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                7. Your Comprehensive Rights Under the DPA
              </h2>
              <p className="mt-1">
                As a recognized data subject under Philippine law, you possess explicit rights
                which you may exercise at any time by contacting our data protection officer:
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">Right to Be Informed:</span> The
                  right to understand how, why, and to what extent your agricultural and personal
                  data is being processed.
                </li>
                <li>
                  <span className="font-medium text-foreground">Right to Access:</span> The right
                  to request a digital copy of the personal and farm-specific data we maintain on
                  our cloud servers.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to Correction (Rectification):
                  </span>{" "}
                  The right to demand the immediate correction of inaccurate, outdated, or false
                  information in your account profile.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to Erasure or Blocking:
                  </span>{" "}
                  The right to suspend, withdraw, or order the removal of your personal
                  information from our active databases upon termination of our business
                  relationship. Erasure is carried out via a request you submit through your
                  account settings, reviewed by an administrator (typically within a few days)
                  before deletion is performed — see Section 5 for the full process. This right
                  does not extend to payment reference numbers and proof-of-payment records, which
                  we retain for the period described in Section 5 to meet accounting and legal
                  recordkeeping obligations, even after an erasure request or account deletion.
                </li>
                <li>
                  <span className="font-medium text-foreground">Right to File a Complaint:</span>{" "}
                  The right to escalate grievances and file a formal complaint with the National
                  Privacy Commission (NPC) if you have reasonable cause to believe your statutory
                  privacy rights have been compromised.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                8. Cookie and Local Storage Policy
              </h2>
              <p className="mt-1">
                Unlike traditional web platforms that rely purely on session cookies, LayerFlow
                utilizes deep local device storage to ensure uninterrupted service inside poultry
                houses and areas lacking cellular network data.
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                <li>
                  <span className="font-medium text-foreground">Local Device Database:</span> We
                  store your input metrics (egg logs, mortality tables, feed tracking) directly on
                  your device storage. This data is kept locally and is only transmitted to our
                  servers once an active internet connection is detected.
                </li>
                <li>
                  <span className="font-medium text-foreground">Expiry Status Cache:</span> To
                  maintain accessibility checks offline, a secure token containing your
                  subscription expiration timestamp is saved on your device&apos;s secure storage
                  layer.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Strictly Necessary Identifiers:
                  </span>{" "}
                  Cryptographically signed JSON Web Tokens (JWT) generated by our authentication
                  engine (Supabase Auth) are temporarily stored on your device to keep you
                  securely logged into your farm profile.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Payment Processing Metadata:
                  </span>{" "}
                  Our current manual payment process does not use third-party payment cookies.
                  Once our automated online checkout via PayMongo is enabled, that payment gateway
                  will set its own operational cookies on the billing/checkout interface for
                  secure tokenization and fraud mitigation on transactions made through it; we do
                  not control those third-party cookies. Blocking cookies does not affect your
                  ability to submit a manual payment for review today.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Cloudflare Performance Cookies:
                  </span>{" "}
                  Cloudflare deploys optimization cookies (such as{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">__cf_bm</code>) to
                  differentiate human users from automated bot networks and route traffic to edge
                  servers closest to your geographic location in the Philippines.
                </li>
                <li>
                  <span className="font-medium text-foreground">Managing Local Data Storage:</span>{" "}
                  Clearing your application data or cache via your device&apos;s operating system
                  settings will completely erase un-synchronized farm records — do not clear
                  application data while offline, as un-synced entries cannot be recovered. You
                  can also configure your browser to block cookies; however, doing so may affect
                  automated checkout once that feature is enabled.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">
                9. Contact and Data Inquiries
              </h2>
              <p className="mt-1">
                For any data privacy concerns, identity updates, data erasure requests, or
                statutory clarifications, please contact our designated Data Protection Officer
                directly at:{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </PageShell>
      </main>

      <PublicFooter />
    </div>
  );
}
