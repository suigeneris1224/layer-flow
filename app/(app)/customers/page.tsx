import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageCustomers } from "@/lib/auth/permissions";
import {
  canAccess,
  canCreate,
  featureLockedPrompt,
  limitReachedPrompt,
} from "@/lib/subscriptions/entitlements";
import { getCustomersWithBalances } from "@/lib/data/customers";
import { Panel } from "@/components/ui/panel";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { EmptyState, StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { formatCurrency } from "@/lib/format";
import { CustomerForm } from "./customer-form";

export const metadata: Metadata = { title: "Customers" };

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "customers")) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Customers"
          description="Keep track of who buys from you and what they owe."
        />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "customers")} />
      </PageShell>
    );
  }

  const customers = await getCustomersWithBalances(context.farmId);

  const canManage = canManageCustomers(context);
  const canAdd = canCreate(entitlement, "customers", customers.length);
  const limitPrompt = !canAdd ? limitReachedPrompt(entitlement, "customers", customers.length) : null;

  return (
    <PageShell>
      <PageHeader title="Customers" description="Who buys from you, and what they owe." />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          message="Add a customer to track credit sales and what they still owe you."
        />
      ) : (
        <Panel title="Your customers">
          <div className="scroll-x">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">Customers on this farm</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 text-left font-medium">Name</th>
                  <th scope="col" className="py-2 text-left font-medium">Phone</th>
                  <th scope="col" className="py-2 text-left font-medium">Address</th>
                  <th scope="col" className="py-2 text-right font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2.5 text-left font-normal">{customer.name}</th>
                    <td className="py-2.5 text-left text-muted-foreground">
                      {customer.phone || "—"}
                    </td>
                    <td className="py-2.5 text-left text-muted-foreground">
                      {customer.address || "—"}
                    </td>
                    <td className="py-2.5 text-right tabular font-medium">
                      {customer.outstanding > 0
                        ? formatCurrency(customer.outstanding, context.currency)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {canManage && limitPrompt && (
        <StatusNote tone="warn" title={limitPrompt.title}>
          {limitPrompt.message} You can still edit or delete existing customers below.
        </StatusNote>
      )}

      {canManage ? (
        <CustomerForm customers={customers} canAdd={canAdd} />
      ) : (
        <StatusNote tone="info">
          Only the farm owner or a manager can manage customers.
        </StatusNote>
      )}
    </PageShell>
  );
}
