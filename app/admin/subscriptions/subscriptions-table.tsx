"use client";

import { useState } from "react";
import { SubscriptionRow, type AdminAccountRowData } from "./subscription-row";
import { OverrideModal } from "./override-modal";

/**
 * Owns the single shared OverrideModal instance -- rendering a modal inside
 * a <tr> would put non-table markup inside <tbody>, so its open/target state
 * lives here, one level up from the rows themselves.
 */
export function SubscriptionsTable({ rows }: { rows: AdminAccountRowData[] }) {
  const [overrideTarget, setOverrideTarget] = useState<AdminAccountRowData | null>(null);

  return (
    <>
      <div className="scroll-x">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <caption className="sr-only">Every account&apos;s subscription, soonest-expiring first</caption>
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="p-3 text-left font-medium">Farms</th>
              <th scope="col" className="p-3 text-left font-medium">Owner</th>
              <th scope="col" className="p-3 text-left font-medium">Plan</th>
              <th scope="col" className="p-3 text-left font-medium">Billing</th>
              <th scope="col" className="p-3 text-left font-medium">Status</th>
              <th scope="col" className="p-3 text-right font-medium">Renews / expires</th>
              <th scope="col" className="p-3 text-right font-medium">Days left</th>
              <th scope="col" className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <SubscriptionRow key={row.ownerId} row={row} onOverride={setOverrideTarget} />
            ))}
          </tbody>
        </table>
      </div>

      <OverrideModal row={overrideTarget} onClose={() => setOverrideTarget(null)} />
    </>
  );
}
