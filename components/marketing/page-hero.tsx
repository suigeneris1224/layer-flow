import { Eyebrow } from "./section";
import { cn } from "@/lib/utils";

/**
 * The two-column hero at the top of every inner marketing page: copy on the
 * left, a photo or product visual on the right, on a sage wash. Stacks below
 * `lg` with the media under the copy, so the h1 is the first thing a phone
 * sees.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  media,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  media?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden bg-section", className)}>
      <div
        className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand/10 blur-3xl"
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 lg:items-center lg:py-20",
          media && "lg:grid-cols-[1fr_1.05fr]"
        )}
      >
        <div className="max-w-xl">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1
            className={cn(
              "text-4xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-5xl",
              eyebrow && "mt-3"
            )}
          >
            {title}
          </h1>
          {lead && <p className="mt-5 text-lg text-muted-foreground">{lead}</p>}
          {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>}
        </div>
        {media && <div className="min-w-0">{media}</div>}
      </div>
    </section>
  );
}
