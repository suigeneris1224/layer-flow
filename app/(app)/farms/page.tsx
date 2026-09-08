import type { Metadata } from "next";
import { requireFarmContext, getUserFarms } from "@/lib/auth/session";
import { canManageFarmSettings } from "@/lib/auth/permissions";
import { canCreate, limitReachedPrompt } from "@/lib/subscriptions/entitlements";
import { getFarmCardsForUser, getFarmDetail } from "@/lib/data/farms";
import { Panel } from "@/components/ui/panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { FarmForm } from "./farm-form";
import { FarmCards } from "@/components/farms/farm-cards";

export const metadata: Metadata = { title: "Farm settings" };

export const dynamic = "force-dynamic";

export default async function FarmsPage({
  searchParams,
}: {
  searchParams: Promise<{ addFarm?: string }>;
}) {
  const context = await requireFarmContext();

  const [farms, detail, { addFarm }] = await Promise.all([
    getUserFarms(),
    getFarmDetail(context.farmId),
    searchParams,
  ]);
  const cardsByFarm = await getFarmCardsForUser(farms.map((farm) => farm.farmId));

  const canEdit = canManageFarmSettings(context);
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };
  // Any signed-in member of a farm may create a brand new farm they'd own --
  // same as onboarding's createFarmAction, which has no role check either.
  const canAddFarm = canCreate(entitlement, "farms", farms.length);
  const limitPrompt = !canAddFarm ? limitReachedPrompt(entitlement, "farms", farms.length) : null;

  return (
    <PageShell>
      <PageHeader title="Farm settings" description="Your farm's name and location." />

      <Panel title="Your farms">
        <FarmCards
          farms={farms.map((farm) => ({
            farmId: farm.farmId,
            farmName: farm.farmName,
            role: farm.role,
            location: cardsByFarm[farm.farmId]?.location ?? "",
            photoUrl: cardsByFarm[farm.farmId]?.photoUrl ?? null,
            totalBirds: cardsByFarm[farm.farmId]?.totalBirds ?? 0,
            houseCount: cardsByFarm[farm.farmId]?.houseCount ?? 0,
          }))}
          activeFarmId={context.farmId}
        />
      </Panel>

      {!detail ? (
        <StatusNote tone="bad">We couldn&apos;t load this farm&apos;s details.</StatusNote>
      ) : canEdit ? (
        <FarmForm key={detail.id} mode="edit" initial={detail} photoUrl={detail.photoUrl} />
      ) : (
        <Panel title={detail.name}>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Barangay</dt>
              <dd>{detail.barangay || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Municipality / City</dt>
              <dd>{detail.municipality}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Province</dt>
              <dd>{detail.province}</dd>
            </div>
          </dl>
          <StatusNote tone="info" className="mt-4">
            Only the farm owner can change farm details.
          </StatusNote>
        </Panel>
      )}

      <div id="add-farm">
        {canAddFarm ? (
          <FarmForm mode="create" forceOpen={addFarm === "1"} />
        ) : (
          limitPrompt && <UpgradePanel prompt={limitPrompt} />
        )}
      </div>

    </PageShell>
  );
}
