import type { Route } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { formatRelativeDay } from "@/lib/format";
import type { AccountDeletionHistoryRow } from "@/lib/data/account-deletion";
import { AdminPagination } from "../pagination";

/**
 * Read-only record of every reviewed account deletion request -- the
 * tracker for what `AccountDeletionPanel` above it processes and then loses
 * from view once a request leaves PENDING. No actions here, just the
 * outcome: `lib/data/account-deletion.ts::getAccountDeletionHistory` is the
 * only thing that changes this list.
 *
 * `requests` is already the current page's slice (see
 * app/admin/subscriptions/page.tsx's own `paginate()` call) -- paginated
 * the same way Payment history and Email logs are, on its own `deletionPage`
 * search param so it doesn't collide with this page's main accounts-table
 * pagination.
 */
export function AccountDeletionHistoryPanel({
  requests,
  page,
  totalPages,
  totalItems,
  hrefForPage,
}: {
  requests: AccountDeletionHistoryRow[];
  page: number;
  totalPages: number;
  totalItems: number;
  hrefForPage: (targetPage: number) => Route;
}) {
  if (totalItems === 0) return null;

  return (
    <Panel title="Account deletion history" bodyClassName="p-0">
      <ul className="flex flex-col divide-y divide-border p-4">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-col gap-1.5 py-3 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{request.email}</p>
              {request.status === "COMPLETED" ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-bad">
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                  Deleted
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <XCircle className="size-3.5 shrink-0" aria-hidden />
                  Rejected
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Requested {formatRelativeDay(request.createdAt.slice(0, 10))}
              {request.reviewedAt && (
                <>
                  {" "}
                  · {request.status === "COMPLETED" ? "Deleted" : "Reviewed"}{" "}
                  {formatRelativeDay(request.reviewedAt.slice(0, 10))}
                  {request.reviewedByEmail && ` by ${request.reviewedByEmail}`}
                </>
              )}
            </p>

            {request.reason && (
              <p className="text-sm text-muted-foreground">
                Requester&apos;s reason: &ldquo;{request.reason}&rdquo;
              </p>
            )}
            {request.status === "REJECTED" && request.rejectionReason && (
              <p className="text-sm text-muted-foreground">
                Rejection reason: &ldquo;{request.rejectionReason}&rdquo;
              </p>
            )}
          </li>
        ))}
      </ul>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemLabel="request"
        hrefForPage={hrefForPage}
      />
    </Panel>
  );
}
