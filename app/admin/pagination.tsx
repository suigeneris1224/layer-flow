import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Prev/Next footer shared by every paginated table under app/admin/. */
export function AdminPagination({
  page,
  totalPages,
  totalItems,
  itemLabel,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  /** Singular noun for the count, e.g. "farm" or "email" -- pluralized here. */
  itemLabel: string;
  hrefForPage: (targetPage: number) => Route;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border p-3 text-sm text-muted-foreground">
      <p>
        Page {page} of {totalPages} &middot; {totalItems} {itemLabel}
        {totalItems === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </Link>
        ) : (
          <span
            aria-disabled
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </span>
        )}
        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span
            aria-disabled
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}
