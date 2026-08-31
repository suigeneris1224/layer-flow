import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canRecordProduction } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { farmToday } from "@/lib/format";
import { ProductionForm } from "./production-form";

export const metadata: Metadata = { title: "Record production" };

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ flock?: string; date?: string }>;
}) {
  const context = await requireFarmContext();

  if (!canRecordProduction(context)) {
    return (
      <PageShell>
        <StatusNote tone="bad" title="No permission">
          Your role doesn&apos;t allow recording production. Ask the farm owner for access.
        </StatusNote>
      </PageShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  const today = farmToday(context.timezone);

  const [flocksResult, sizesResult, lastFeedResult] = await Promise.all([
    supabase
      .from("flocks")
      .select("id, name, breed, current_hens")
      .eq("farm_id", context.farmId)
      .in("status", ["GROWING", "PRODUCING"])
      .order("name"),
    supabase
      .from("egg_sizes")
      .select("id, name, code")
      .eq("farm_id", context.farmId)
      .eq("is_active", true)
      .order("sort_order"),
    // Pre-fill the feed price with whatever they paid last, so the common case
    // is one number instead of two.
    supabase
      .from("feed_usage")
      .select("cost_per_kg")
      .eq("farm_id", context.farmId)
      .order("usage_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const flocks = flocksResult.data ?? [];

  if (flocks.length === 0) {
    return (
      <PageShell>
        <EmptyState
          icon={ClipboardList}
          title="No active flocks"
          message="Add a flock before recording production."
          actionLabel="Go to overview"
          actionHref="/dashboard"
        />
      </PageShell>
    );
  }

  // "Edit this day" on /production/[id] links here with the flock and date it
  // wants. Both are validated against what this farm actually has -- a stray
  // query string should land on today's blank form, not on someone else's.
  const { flock: flockParam, date: dateParam } = await searchParams;
  const initialFlockId = flocks.some((f) => f.id === flockParam)
    ? flockParam
    : undefined;
  const initialDate = dateParam && ISO_DATE.test(dateParam) ? dateParam : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Record production"
        description="Just the eggs and the hens is enough. Everything else is optional."
      />

      <ProductionForm
        flocks={flocks}
        eggSizes={sizesResult.data ?? []}
        today={today}
        initialFlockId={initialFlockId}
        initialDate={initialDate}
        lastFeedCostPerKg={Number(lastFeedResult.data?.cost_per_kg ?? 0)}
        currency={context.currency}
      />
    </PageShell>
  );
}
