import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { signOutAction } from "@/app/auth/actions";
import { getBetaStatusSummary } from "@/lib/data/admin";
import { Brand } from "@/components/nav/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminSidebar, AdminMobileNav } from "./admin-sidebar";
import { AdminStatusBadges } from "./admin-status-badges";

/**
 * Shell for the platform-admin pages (app/admin/).
 *
 * Deliberately not the farm-scoped AppLayout -- that shell assumes a farm
 * (sidebar plan card, farm switcher, offline queue) that has nothing to do
 * with an operator looking across every farm at once. `requirePlatformAdmin`
 * is the actual gate; every page under this layout can assume it already ran.
 *
 * getBetaStatusSummary() runs on every admin page load (it backs the
 * top-bar badges), so it's deliberately the lightweight query -- just a
 * count, not the full tester list app/admin/beta-settings/ needs.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  const betaStatus = await getBetaStatusSummary();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <Brand compact />
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            Admin
          </span>
        </div>

        <AdminStatusBadges
          betaEnabled={betaStatus.enabled}
          activeBetaUsers={betaStatus.testerCount}
        />

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">Back to app</span>
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </header>

      <AdminMobileNav />

      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
