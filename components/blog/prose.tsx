import Link from "next/link";
import type { Route } from "next";
import { Calculator, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Long-form article typography. Styled with child selectors rather than the
 * typography plugin: the posts use a handful of elements, and every colour
 * here has to come from the design tokens anyway.
 */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-base leading-relaxed text-muted-foreground",
        "[&>*+*]:mt-5",
        "[&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground",
        "[&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-2 [&_li]:pl-1",
        "[&_table]:w-full [&_table]:text-sm [&_th]:p-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_td]:p-2.5 [&_tr]:border-b [&_tr]:border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

/** A formula, set apart so it can be found again at a glance. */
export function Formula({ children, label = "Formula" }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-section p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-strong">
        <Calculator className="size-4" aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">{children}</p>
    </div>
  );
}

/** A worked example or practical tip. */
export function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <Lightbulb className="size-4 text-chip-amber-fg" aria-hidden />
        {title}
      </p>
      <div className="mt-2 text-sm leading-relaxed [&>*+*]:mt-2">{children}</div>
    </aside>
  );
}

/** In-article link. Takes a plain string so posts can link each other by slug. */
export function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href as Route} className="font-medium text-primary-strong underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

/** Worked-example table: each row a label and its value. */
export function ExampleTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="scroll-x-flush rounded-xl border border-border bg-surface">
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="last:border-0">
              <td className="text-muted-foreground">{label}</td>
              <td className="text-right font-semibold tabular text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
