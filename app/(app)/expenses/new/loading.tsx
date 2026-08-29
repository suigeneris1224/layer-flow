import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function NewExpenseLoading() {
  return (
    <PageShell width="reading" role="status" aria-label="Loading the expense form">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-96" />
    </PageShell>
  );
}
