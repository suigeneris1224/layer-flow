import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { signOutAction } from "@/app/auth/actions";
import { Brand } from "@/components/nav/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shell for the platform-admin pages (app/admin/).
 *
 * Deliberately not the farm-scoped AppLayout -- that shell assumes a farm
 * (sidebar plan card, farm switcher, offline queue) that has nothing to do
 * with an operator looking across every farm at once. `requirePlatformAdmin`
 * is the actual gate; every page under this layout can assume it already ran.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <Brand compact />
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            Admin
          </span>
        </div>

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

      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
