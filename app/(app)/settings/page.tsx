import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CreditCard, LogOut, Warehouse } from "lucide-react";
import { requireFarmContext, requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { PLANS } from "@/lib/subscriptions/plans";
import { effectivePlan } from "@/lib/subscriptions/entitlements";
import { getProfile } from "@/lib/data/profile";
import { signOutAction } from "@/app/auth/actions";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const context = await requireFarmContext();

  const profile = await getProfile(user.id);
  const plan = PLANS[effectivePlan(context.plan, context.subscriptionStatus)];

  return (
    <PageShell>
      <PageHeader title="Settings" description="Your account and this farm." />

      <ProfileForm
        email={user.email}
        // The table is the source of truth; auth metadata is only the fallback
        // for a profile row that has not been filled in yet.
        initialFullName={profile?.fullName || user.fullName}
        initialPhone={profile?.phone ?? ""}
        avatarUrl={profile?.avatarUrl ?? null}
        coverUrl={profile?.coverUrl ?? null}
      />

      <Panel title="This farm">
        <dl className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Farm</dt>
            <dd className="text-sm font-medium">{context.farmName}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Your role</dt>
            <dd className="text-sm font-medium">{ROLE_LABELS[context.role]}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Plan</dt>
            <dd className="text-sm font-medium">{plan.name}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <Link
            href="/farms"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Warehouse className="size-4" aria-hidden />
            Farm settings
          </Link>
          <Link
            href="/billing"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <CreditCard className="size-4" aria-hidden />
            Plans and billing
          </Link>
          <Link
            href="/settings/alerts"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <BellRing className="size-4" aria-hidden />
            Alert settings
          </Link>
        </div>
      </Panel>

      <Panel title="Session">
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </form>
      </Panel>
    </PageShell>
  );
}
