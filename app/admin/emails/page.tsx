import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Mail } from "lucide-react";
import { getEmailLog, type EmailKind, type EmailTrigger } from "@/lib/data/admin";
import { paginate, ADMIN_PAGE_SIZE } from "@/lib/domain/admin";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminPagination } from "../pagination";

export const metadata: Metadata = { title: "Admin — Emails" };

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

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const rows = await getEmailLog();
  const { items: pageRows, page, totalPages, totalItems } = paginate(
    rows,
    Number(pageParam) || 1,
    ADMIN_PAGE_SIZE
  );
  const pageHref = (targetPage: number): Route =>
    (targetPage > 1 ? `/admin/emails?page=${targetPage}` : "/admin/emails") as Route;

  return (
    <PageShell>
      <PageHeader
        title="Email log"
        description="Every subscription email LayerFlow has sent, newest first."
        action={
          <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">Back to subscriptions</span>
            <span className="sm:hidden">Back</span>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={Mail} title="No emails sent yet" message="Nothing has gone out yet." />
      ) : (
        <Panel title={`Last ${totalItems}`} bodyClassName="p-0">
          <div className="scroll-x">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">Subscription emails sent, newest first</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="p-3 text-left font-medium">Farm</th>
                  <th scope="col" className="p-3 text-left font-medium">Email</th>
                  <th scope="col" className="p-3 text-left font-medium">Sent to</th>
                  <th scope="col" className="p-3 text-left font-medium">Trigger</th>
                  <th scope="col" className="p-3 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <th scope="row" className="p-3 text-left font-medium">{row.farmName}</th>
                    <td className="p-3 text-left">{KIND_LABEL[row.kind]}</td>
                    <td className="p-3 text-left text-muted-foreground">{TO_LABEL[row.to]}</td>
                    <td className="p-3 text-left text-muted-foreground">{TRIGGER_LABEL[row.trigger]}</td>
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
