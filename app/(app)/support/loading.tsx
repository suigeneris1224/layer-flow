import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function SupportLoading() {
  return (
    <PageShell role="status" aria-label="Loading support">
      <Skeleton className="h-9 w-52" />
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-56" />
      </div>
    </PageShell>
  );
}
