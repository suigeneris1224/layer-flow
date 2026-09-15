import type { Metadata } from "next";
import { requireFarmContext, requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { PLANS } from "@/lib/subscriptions/plans";
import { effectivePlan } from "@/lib/subscriptions/entitlements";
import { getProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Profile" };

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const context = await requireFarmContext();

  const profile = await getProfile(user.id);
  const plan = PLANS[effectivePlan(context.plan, context.subscriptionStatus)];

  return (
    <>
      <div className="md:hidden">
        <PageHeader title="Profile" description="Your personal information and account." />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
        <ProfileForm
          email={user.email}
          // The table is the source of truth; auth metadata is only the fallback
          // for a profile row that has not been filled in yet.
          initialFullName={profile?.fullName || user.fullName}
          initialPhone={profile?.phone ?? ""}
          avatarUrl={profile?.avatarUrl ?? null}
          coverUrl={profile?.coverUrl ?? null}
        />

        <div className="flex flex-col gap-4 lg:gap-5">
          <Panel title="Account information">
            <dl className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd className="text-sm font-medium">{ROLE_LABELS[context.role]}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Current farm</dt>
                <dd className="text-sm font-medium">{context.farmName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Plan</dt>
                <dd className="text-sm font-medium">
                  {plan.name}
                  {context.isBetaOverride && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (Beta access)
                    </span>
                  )}
                </dd>
              </div>
              {profile?.createdAt && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Member since</dt>
                  <dd className="text-sm font-medium">
                    {formatDate(profile.createdAt, context.timezone)}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}
