import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Zero-JS accordion via native <details>/<summary> -- accessible for free. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium marker:content-none">
            {item.question}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
