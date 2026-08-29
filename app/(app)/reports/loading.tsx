import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function ReportsLoading() {
  return (
    <PageShell role="status" aria-label="Loading reports">
      <Skeleton className="h-9 w-52" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </PageShell>
  );
}
