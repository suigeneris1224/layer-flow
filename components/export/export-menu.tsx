import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { Select } from "@/components/ui/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The Export control in a page header.
 *
 * A plain GET form rather than a link or a popover: submitting it hits the
 * route handler, which answers with Content-Disposition and so downloads
 * without navigating. That means no client JavaScript, no `as Route` cast
 * around a typed route, and no prefetch of a file.
 *
 * The range lives here rather than on the page because neither /sales nor
 * /expenses has a date filter -- exporting "what the page shows" would hand
 * somebody ten rows.
 */

const RANGES = [
  { value: "month", label: "This month" },
  { value: "30", label: "Last 30 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "Everything" },
] as const;

export function ExportMenu({
  action,
  label,
  locked,
}: {
  /** The route handler path, e.g. "/api/export/sales". */
  action: string;
  /** Names the data in the control's accessible label. */
  label: string;
  locked: boolean;
}) {
  /*
   * A control that fails when pressed is worse than one that says why. The
   * pricing page is a better answer than hiding the feature entirely, which
   * would leave a farmer no way to discover it exists.
   */
  if (locked) {
    return (
      <Link
        href="/pricing"
        className={cn(buttonVariants({ variant: "outline", size: "md" }))}
      >
        <Lock className="size-4" aria-hidden />
        Export (Pro)
      </Link>
    );
  }

  return (
    <form action={action} method="GET" className="flex items-center gap-2">
      <label htmlFor={`${action}-range`} className="sr-only">
        {label} to export
      </label>
      <Select id={`${action}-range`} name="range" defaultValue="month" fit>
        {RANGES.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </Select>

      <Button type="submit" variant="outline" size="md">
        <Download className="size-4" aria-hidden />
        Export
      </Button>
    </form>
  );
}
