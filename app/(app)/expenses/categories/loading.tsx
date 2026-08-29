import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function ExpenseCategoriesLoading() {
  return (
    <PageShell width="reading" role="status" aria-label="Loading expense categories">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-72" />
    </PageShell>
  );
}
