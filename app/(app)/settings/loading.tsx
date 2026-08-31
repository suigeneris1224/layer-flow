import { Skeleton } from "@/components/ui/states";
import { PageShell } from "@/components/layout/page-shell";

export default function SettingsLoading() {
  return (
    <PageShell width="reading" role="status" aria-label="Loading your settings">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-96" />
      <Skeleton className="h-48" />
    </PageShell>
  );
}
