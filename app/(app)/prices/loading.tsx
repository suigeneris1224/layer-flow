import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function PricesLoading() {
  return (
    <PageShell
      role="status"
      aria-label="Loading your prices"
    >
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-56" />
      <Skeleton className="h-72" />
    </PageShell>
  );
}
