import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function TeamLoading() {
  return (
    <PageShell width="reading" role="status" aria-label="Loading your team">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-56" />
      <Skeleton className="h-64" />
    </PageShell>
  );
}
