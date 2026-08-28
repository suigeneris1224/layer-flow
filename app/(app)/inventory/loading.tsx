import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function InventoryLoading() {
  return (
    <PageShell
      role="status"
      aria-label="Loading your inventory"
    >
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-64" />
      <Skeleton className="h-80" />
    </PageShell>
  );
}
