import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function AnalyticsLoading() {
  return (
    <PageShell role="status" aria-label="Loading analytics">
      <Skeleton className="h-9 w-52" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-64 lg:col-span-8" />
        <Skeleton className="h-64 lg:col-span-4" />
      </div>
      <Skeleton className="h-64" />
    </PageShell>
  );
}
