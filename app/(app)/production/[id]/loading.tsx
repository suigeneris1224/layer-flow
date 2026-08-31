import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function ProductionDayLoading() {
  return (
    <PageShell width="reading" role="status" aria-label="Loading the day">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </PageShell>
  );
}
