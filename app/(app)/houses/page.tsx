import type { Metadata } from "next";
import { Home } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageHouse } from "@/lib/auth/permissions";
import { canCreate, limitReachedPrompt } from "@/lib/subscriptions/entitlements";
import { getHouses } from "@/lib/data/houses";
import { Panel } from "@/components/ui/panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { formatNumber } from "@/lib/format";
import { HouseForm } from "./house-form";

export const metadata: Metadata = { title: "Houses" };

export const dynamic = "force-dynamic";

export default async function HousesPage() {
  const context = await requireFarmContext();
  const houses = await getHouses(context.farmId);

  const canManage = canManageHouse(context);
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const canAdd = canCreate(entitlement, "houses", houses.length);
  const limitPrompt = !canAdd ? limitReachedPrompt(entitlement, "houses", houses.length) : null;

  return (
    <PageShell>
      <PageHeader title="Houses" description="Where your flocks are kept." />

      {houses.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No houses yet"
          message="Add a house before you can add a flock to it."
        />
      ) : (
        <Panel title="Your houses">
          <div className="scroll-x">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">Houses on this farm</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 text-left font-medium">Name</th>
                  <th scope="col" className="py-2 text-right font-medium">Capacity</th>
                  <th scope="col" className="py-2 text-right font-medium">Flocks</th>
                  <th scope="col" className="py-2 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((house) => (
                  <tr key={house.id} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2.5 text-left font-normal">{house.name}</th>
                    <td className="py-2.5 text-right tabular">{formatNumber(house.capacity)}</td>
                    <td className="py-2.5 text-right tabular text-muted-foreground">
                      {house.activeFlockCount > 0
                        ? `${house.activeFlockCount} active`
                        : house.flockCount > 0
                          ? `${house.flockCount} past`
                          : "None"}
                    </td>
                    <td className="py-2.5 text-left text-muted-foreground">
                      {house.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {canManage && limitPrompt && (
        <StatusNote tone="warn" title={limitPrompt.title}>
          {limitPrompt.message} You can still edit your existing houses below.
        </StatusNote>
      )}

      {canManage ? (
        <HouseForm houses={houses} canAdd={canAdd} />
      ) : (
        <StatusNote tone="info">
          Only the farm owner or a manager can manage houses.
        </StatusNote>
      )}
    </PageShell>
  );
}
