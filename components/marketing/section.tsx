import { cn } from "@/lib/utils";

/**
 * One horizontal band of a marketing page. `tone="tint"` gives it the soft
 * sage wash that alternates with plain bands down the page.
 */
export function Section({
  children,
  tone = "plain",
  className,
  innerClassName,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  tone?: "plain" | "tint";
  innerClassName?: string;
}) {
  return (
    <section {...props} className={cn(tone === "tint" && "bg-section", className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 py-14 lg:py-20", innerClassName)}>
        {children}
      </div>
    </section>
  );
}

/** Eyebrow + h2 + lead, the opening of almost every section. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Heading
        className={cn(
          "font-bold tracking-tight text-foreground",
          eyebrow && "mt-2",
          Heading === "h1" ? "text-4xl leading-[1.1] lg:text-5xl" : "text-2xl lg:text-3xl"
        )}
      >
        {title}
      </Heading>
      {lead && <p className="mt-3 text-base text-muted-foreground lg:text-lg">{lead}</p>}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-primary-strong">{children}</p>
  );
}
