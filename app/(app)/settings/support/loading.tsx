import { Skeleton } from "@/components/ui/states";

export default function SupportLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading support">
      <Skeleton className="h-9 w-52" />
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
