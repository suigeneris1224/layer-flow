import type { Metadata, Route } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageFlock } from "@/lib/auth/permissions";
import { canCreate, limitReachedPrompt } from "@/lib/subscriptions/entitlements";
import { getFlocks, getHouseOptions } from "@/lib/data/flocks";
import { Panel } from "@/components/ui/panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FlockForm } from "./flock-form";

export const metadata: Metadata = { title: "Flocks" };

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  GROWING: "Growing",
  PRODUCING: "Producing",
  SOLD: "Sold",
  CLOSED: "Closed",
};

const STATUS_TONE: Record<string, string> = {
  GROWING: "text-[hsl(var(--status-warn))]",
  PRODUCING: "text-[hsl(var(--status-good))]",
  SOLD: "text-muted-foreground",
  CLOSED: "text-muted-foreground",
};

export default async function FlocksPage() {
  const context = await requireFarmContext();
  const [flocks, houseOptions] = await Promise.all([
    getFlocks(context.farmId),
    getHouseOptions(context.farmId),
  ]);

  const canManage = canManageFlock(context);
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  const activeCount = flocks.filter(
    (flock) => flock.status === "GROWING" || flock.status === "PRODUCING"
  ).length;
  const canAdd = canCreate(entitlement, "active_flocks", activeCount);
  const limitPrompt = !canAdd
    ? limitReachedPrompt(entitlement, "active_flocks", activeCount)
    : null;

  return (
    <PageShell>
      <PageHeader title="Flocks" description="Every batch of hens you're raising or laying." />

      {flocks.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No flocks yet"
          message={
            houseOptions.length === 0
              ? "Add a house first, then add your first flock."
              : "Add a flock to start recording production against it."
          }
        />
      ) : (
        <Panel title="Your flocks">
          <div className="scroll-x">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">Flocks on this farm</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 text-left font-medium">Name</th>
                  <th scope="col" className="py-2 text-left font-medium">House</th>
                  <th scope="col" className="py-2 text-right font-medium">Hens</th>
                  <th scope="col" className="py-2 text-left font-medium">Placed</th>
                  <th scope="col" className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {flocks.map((flock) => (
                  <tr key={flock.id} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2.5 text-left font-normal">
                      <Link
                        href={`/flocks/${flock.id}` as Route}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {flock.name}
                      </Link>
                      {flock.breed && (
                        <span className="block text-xs text-muted-foreground">{flock.breed}</span>
                      )}
                    </th>
                    <td className="py-2.5 text-left text-muted-foreground">{flock.houseName}</td>
                    <td className="py-2.5 text-right tabular">
                      {formatNumber(flock.currentHens)}
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        / {formatNumber(flock.initialHens)}
                      </span>
                    </td>
                    <td className="py-2.5 text-left text-muted-foreground">
                      {formatDate(flock.placementDate, context.timezone)}
                    </td>
                    <td className={cn("py-2.5 text-right font-medium", STATUS_TONE[flock.status])}>
                      {STATUS_LABEL[flock.status]}
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
          {limitPrompt.message} You can still edit or retire existing flocks below.
        </StatusNote>
      )}

      {canManage ? (
        houseOptions.length === 0 ? (
          <StatusNote tone="info">Add a house before you can add a flock.</StatusNote>
        ) : (
          <FlockForm flocks={flocks} houses={houseOptions} canAdd={canAdd} />
        )
      ) : (
        <StatusNote tone="info">
          Only the farm owner or a manager can manage flocks.
        </StatusNote>
      )}
    </PageShell>
  );
}
