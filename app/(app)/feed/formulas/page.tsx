import type { Metadata, Route } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { requireFarmContext } from "@/lib/auth/session";
import { canManageFeedFormulas } from "@/lib/auth/permissions";
import { canAccess, featureLockedPrompt } from "@/lib/subscriptions/entitlements";
import { getFormulas, getIngredients } from "@/lib/data/feed-formulas";
import { formulaTotals } from "@/lib/domain/feed-formulation";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/ui/panel";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FormulaEditor } from "./formula-editor";
import { IngredientForm } from "./ingredient-form";

export const metadata: Metadata = { title: "Feed formulas" };

export const dynamic = "force-dynamic";

type Tab = "formulas" | "ingredients";

const TABS: { id: Tab; label: string }[] = [
  { id: "formulas", label: "Formulas" },
  { id: "ingredients", label: "Ingredients" },
];

export default async function FeedFormulasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "feed_formulation")) {
    return (
      <PageShell width="reading">
        <PageHeader title="Feed formulas" description="Mix your own feed and know its cost." />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "feed_formulation")} />
      </PageShell>
    );
  }

  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "formulas";
  const canManage = canManageFeedFormulas(context);

  const [formulas, ingredients] = await Promise.all([
    getFormulas(context.farmId),
    getIngredients(context.farmId),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Feed formulas"
        description="Your own ingredients and mixes, with the protein, energy and cost per kg of each."
      />

      <nav aria-label="Feed formulas" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            href={`/feed/formulas?tab=${entry.id}` as Route}
            aria-current={tab === entry.id ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: tab === entry.id ? "primary" : "outline", size: "sm" })
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {tab === "formulas" &&
          (canManage ? (
            <FormulaEditor formulas={formulas} ingredients={ingredients} currency={context.currency} />
          ) : (
            <Panel title="Formulas" className="lg:col-span-2">
              {formulas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No formulas yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {formulas.map((formula) => {
                    const totals = formulaTotals(formula.lines, ingredients, formula.batchKg);
                    return (
                      <li key={formula.id} className="flex justify-between gap-3 py-3 first:pt-0">
                        <span className="text-sm font-medium">{formula.name}</span>
                        <span className="text-sm tabular text-muted-foreground">
                          {formatNumber(totals.proteinPct, 1)}% protein ·{" "}
                          {formatCurrency(totals.costPerKg, context.currency)}/kg
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ))}

        {tab === "ingredients" && (
          <>
            <Panel title="Your ingredients">
              {ingredients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ingredients yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {ingredients.map((ingredient) => (
                    <li key={ingredient.id} className="py-3 first:pt-0">
                      <div className="flex justify-between gap-3">
                        <span className="text-sm font-medium">{ingredient.name}</span>
                        <span className="text-sm font-semibold tabular">
                          {formatCurrency(ingredient.pricePerKg, context.currency)}/kg
                        </span>
                      </div>
                      <p className="text-xs tabular text-muted-foreground">
                        {formatNumber(ingredient.proteinPct, 1)}% protein ·{" "}
                        {formatNumber(ingredient.energyKcalPerKg)} kcal/kg ·{" "}
                        {formatNumber(ingredient.calciumPct, 2)}% Ca ·{" "}
                        {formatNumber(ingredient.phosphorusPct, 2)}% P
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            {canManage && <IngredientForm ingredients={ingredients} currency={context.currency} />}
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        <FlaskConical className="mr-1 inline size-3" aria-hidden />
        LayerFlow does the math on the values you enter. For what your hens need at each stage,
        ask your nutritionist, vet or feed supplier.
      </p>
    </PageShell>
  );
}
