import type { Metadata } from "next";
import { getSupportRequests } from "@/lib/data/admin";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { SupportPanel } from "./support-panel";

export const metadata: Metadata = { title: "Admin — Tickets" };

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const supportRequests = await getSupportRequests();

  return (
    <PageShell>
      <PageHeader title="Tickets" description="Support requests from farmers, newest and highest-priority first." />
      <SupportPanel requests={supportRequests} />
    </PageShell>
  );
}
