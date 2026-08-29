import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function SalePaymentLoading() {
  return (
    <PageShell width="reading" role="status" aria-label="Loading the payment form">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-40" />
      <Skeleton className="h-56" />
    </PageShell>
  );
}
