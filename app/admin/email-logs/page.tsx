import type { Metadata } from "next";
import type { Route } from "next";
import { getEmailLog, type EmailKind, type EmailTrigger } from "@/lib/data/admin";
import { getRecentEmailEvents } from "@/lib/data/email-events";
import { paginate, ADMIN_PAGE_SIZE } from "@/lib/domain/admin";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { Mail } from "lucide-react";
import { formatDate } from "@/lib/format";
import { AdminPagination } from "../pagination";
import { EventStatusPill, SentStatusPill } from "./status-pill";

export const metadata: Metadata = { title: "Admin — Email logs" };

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<EmailKind | "unknown", string> = {
  receipt: "Receipt",
  past_due_reminder: "Past-due reminder",
  renewal_reminder: "Renewal reminder",
  unknown: "Unknown",
};

const TRIGGER_LABEL: Record<EmailTrigger | "unknown", string> = {
  manual: "Manual",
  cron: "Automatic (daily job)",
  unknown: "Unknown",
};

const TO_LABEL: Record<"self" | "owner" | "unknown", string> = {
  self: "Account owner (self-requested)",
  owner: "Farm owner",
  unknown: "Unknown",
};

/**
 * Two logs, deliberately kept separate rather than merged into one table:
 * the "sent" trail (audit_logs, unchanged from before this route existed)
 * proves the app tried; the delivery-events table (email_events, written by
 * app/api/webhooks/brevo/route.ts) proves what actually happened to it.
 * They're joined only visually, by recipient/timestamp, not by a database
 * join -- a webhook event has no audit_logs row to key against.
 */
export default async function AdminEmailLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const [sentRows, events] = await Promise.all([getEmailLog(), getRecentEmailEvents()]);
  const { items: pageRows, page, totalPages, totalItems } = paginate(
    sentRows,
    Number(pageParam) || 1,
    ADMIN_PAGE_SIZE
  );
  const pageHref = (targetPage: number): Route =>
    (targetPage > 1 ? `/admin/email-logs?page=${targetPage}` : "/admin/email-logs") as Route;

  return (
    <PageShell>
      <PageHeader
        title="Email logs"
        description="What LayerFlow sent, and what Brevo reports actually happened to it."
      />

      <Panel title="Delivery events" bodyClassName="p-0">
        {events.length === 0 ? (
          <div className="p-4">
            <StatusNote tone="info">
              No delivery events yet. Brevo&apos;s webhook needs to be pointed at{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/webhooks/brevo</code> in
              its dashboard (Transactional → Settings → Webhooks) before any will arrive.
            </StatusNote>
          </div>
        ) : (
          <div className="scroll-x">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">Brevo delivery events, newest first</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Recipient</th>
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Template</th>
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Status</th>
                  <th scope="col" className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide">When</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0">
                    <td className="p-3 text-left">{event.recipient}</td>
                    <td className="p-3 text-left text-muted-foreground">{event.tag ?? "—"}</td>
                    <td className="p-3 text-left"><EventStatusPill event={event.event} /></td>
                    <td className="p-3 text-right tabular">{formatDate(event.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {sentRows.length === 0 ? (
        <EmptyState icon={Mail} title="No emails sent yet" message="Nothing has gone out yet." />
      ) : (
        <Panel title={`Sent (last ${totalItems})`} bodyClassName="p-0">
          <div className="scroll-x">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">Subscription emails sent, newest first</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Farm</th>
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Template</th>
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Sent to</th>
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Trigger</th>
                  <th scope="col" className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide">Status</th>
                  <th scope="col" className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide">When</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <th scope="row" className="p-3 text-left font-medium">{row.farmName}</th>
                    <td className="p-3 text-left">{KIND_LABEL[row.kind]}</td>
                    <td className="p-3 text-left text-muted-foreground">{TO_LABEL[row.to]}</td>
                    <td className="p-3 text-left text-muted-foreground">{TRIGGER_LABEL[row.trigger]}</td>
                    <td className="p-3 text-left"><SentStatusPill /></td>
                    <td className="p-3 text-right tabular">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemLabel="email"
            hrefForPage={pageHref}
          />
        </Panel>
      )}
    </PageShell>
  );
}
