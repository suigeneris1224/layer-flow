import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function FarmsLoading() {
  return (
    <PageShell width="reading" role="status" aria-label="Loading your farm">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-64" />
    </PageShell>
  );
}
