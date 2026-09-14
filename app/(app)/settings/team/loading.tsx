import { Skeleton } from "@/components/ui/states";

export default function TeamLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading your team">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-56" />
      <Skeleton className="h-64" />
    </div>
  );
}
