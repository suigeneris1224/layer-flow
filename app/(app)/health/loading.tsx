import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function HealthLoading() {
  return (
    <PageShell role="status" aria-label="Loading flock health records">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Skeleton className="h-72" />
        <Skeleton className="h-96" />
      </div>
    </PageShell>
  );
}
