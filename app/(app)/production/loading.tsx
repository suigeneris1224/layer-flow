import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function ProductionLoading() {
  return (
    <PageShell role="status" aria-label="Loading your production history">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-96" />
    </PageShell>
  );
}
