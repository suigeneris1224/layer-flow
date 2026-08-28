import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function DashboardLoading() {
  return (
    <PageShell
      role="status"
      aria-label="Loading your farm"
    >
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-12" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>

      <Skeleton className="h-56" />
      <Skeleton className="h-48" />
      <Skeleton className="h-40" />
    </PageShell>
  );
}
