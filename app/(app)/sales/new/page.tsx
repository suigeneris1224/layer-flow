import type { Metadata } from "next";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageSales } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getSaleFormData } from "@/lib/data/sales";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { farmToday } from "@/lib/format";
import { SaleForm } from "./sale-form";

export const metadata: Metadata = { title: "Record a sale" };

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const today = farmToday(context.timezone);

  // Gated at the route as well as in the action: a farmer on Free should meet
  // the upgrade prompt, never a form that fails when they press save.
  if (!canAccess(entitlement, "egg_sales")) {
    return (
      <PageShell width="reading">
        <PageHeader title="Record a sale" />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "egg_sales")} />
      </PageShell>
    );
  }

  if (!canManageSales(context)) {
    return (
      <PageShell width="reading">
        <PageHeader title="Record a sale" />
        <StatusNote tone="info">
          Only the farm owner or a manager can record sales.
        </StatusNote>
      </PageShell>
    );
  }

  const { sizes, customers, flocks, stock } = await getSaleFormData(context, today);

  return (
    <PageShell>
      <PageHeader
        title="Record a sale"
        description="Trays and loose eggs are priced separately. Today's prices are filled in for you."
      />

      <SaleForm
        sizes={sizes.map((size) => ({
          eggSizeId: size.eggSizeId,
          name: size.name,
          pricePerTray: size.currentPrice?.pricePerTray ?? 0,
          pricePerEgg: size.currentPrice?.pricePerEgg ?? 0,
        }))}
        customers={customers}
        flocks={flocks}
        stock={stock}
        today={today}
        currency={context.currency}
      />
    </PageShell>
  );
}
