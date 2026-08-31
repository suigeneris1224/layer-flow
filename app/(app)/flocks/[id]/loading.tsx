import { LoadingTiles, Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function FlockDetailLoading() {
  return (
    <PageShell role="status" aria-label="Loading the flock">
      <Skeleton className="h-9 w-56" />
      <LoadingTiles />
      <Skeleton className="h-48" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </PageShell>
  );
}
