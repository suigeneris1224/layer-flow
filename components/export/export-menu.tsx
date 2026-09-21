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
 * A page with no date filter of its own gets its own range picker here,
 * since exporting "what the page shows" would hand somebody ten rows. A page
 * that already has one (Sales History, Expenses) passes `fixedRange`
 * instead: Export then downloads exactly what's on screen, rather than
 * showing a second, differently-worded dropdown that would only ever affect
 * the file and never the list next to it.
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
  fixedRange,
}: {
  /** The route handler path, e.g. "/api/export/sales". */
  action: string;
  /** Names the data in the control's accessible label. */
  label: string;
  locked: boolean;
  /**
   * Submit this range with no visible picker, instead of RANGES above --
   * matches the values lib/domain/reports.ts's resolveReportRange (which the
   * export route itself resolves `range` through) already accepts, plus
   * "all" for unbounded. Pass the host page's own selected range.
   */
  fixedRange?: string;
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
      {fixedRange ? (
        <input type="hidden" name="range" value={fixedRange} />
      ) : (
        <>
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
        </>
      )}

      <Button type="submit" variant="outline" size="md">
        <Download className="size-4" aria-hidden />
        Export
      </Button>
    </form>
  );
}
