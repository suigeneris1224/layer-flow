import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function ExpensesLoading() {
  return (
    <PageShell role="status" aria-label="Loading your expenses">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-96" />
    </PageShell>
  );
}
