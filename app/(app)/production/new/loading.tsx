import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function NewProductionLoading() {
  return (
    <PageShell role="status" aria-label="Loading the production form">
      <Skeleton className="h-9 w-56" />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-80" />
      </div>
    </PageShell>
  );
}
