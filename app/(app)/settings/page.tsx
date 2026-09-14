import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { visibleSettingsCategories } from "@/lib/domain/settings-categories";
import { PageHeader } from "@/components/layout/page-shell";
import { DesktopSettingsRedirect } from "@/components/nav/desktop-settings-redirect";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const context = await requireFarmContext();
  const visible = visibleSettingsCategories(context);

  return (
    <div className="md:hidden">
      <DesktopSettingsRedirect />

      <PageHeader title="Settings" description="Manage your farm and account." />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((category) => (
          <Link
            key={category.key}
            href={category.href}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-card",
              "transition-colors hover:border-foreground/20 hover:bg-muted"
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <category.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-medium">
                {category.title}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {category.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
