import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";
import { StickyNavBlur } from "./sticky-nav-blur";

/**
 * The shell every public marketing page shares: sticky header, <main>, footer,
 * plus any JSON-LD blocks for the page. JSON-LD doesn't need to live in <head>
 * -- search engines read it anywhere in the document.
 */
export function MarketingPage({
  children,
  jsonLd = [],
}: {
  children: React.ReactNode;
  jsonLd?: object[];
}) {
  return (
    // min-w-0: a flex item's default min-width is auto, so a wide table
    // (pricing's comparison) could otherwise widen the whole page on Safari.
    <div className="flex min-h-dvh min-w-0 flex-col">
      {jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <StickyNavBlur>
        <PublicHeader />
      </StickyNavBlur>
      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
