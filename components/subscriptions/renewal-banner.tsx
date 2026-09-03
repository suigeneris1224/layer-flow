import Link from "next/link";
import { StatusNote } from "@/components/ui/states";
import { renewalBanner } from "@/lib/subscriptions/renewal-status";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * The in-app counterpart to the renewal/past-due reminder emails, for an
 * owner who might not check email as often as they open the app. Callers
 * gate this on canManageBilling(context) themselves -- it has no opinion on
 * who's allowed to see it, only on what to say once shown.
 */
export function RenewalBanner({
  plan,
  status,
  currentPeriodEnd,
  showManageLink = true,
}: {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  /** Off on /billing itself, where a link back to the same page is pointless. */
  showManageLink?: boolean;
}) {
  const banner = renewalBanner({ plan, status }, currentPeriodEnd);
  if (!banner) return null;

  return (
    <StatusNote tone={banner.tone}>
      {banner.message}
      {showManageLink && (
        <>
          {" "}
          <Link href="/billing" className="font-medium underline">
            Manage billing
          </Link>
        </>
      )}
    </StatusNote>
  );
}
