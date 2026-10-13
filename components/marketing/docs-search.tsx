"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";

export interface DocsSearchEntry {
  id: string;
  title: string;
  /** Extra words a farmer might search for that aren't in the title. */
  keywords: string;
}

/**
 * Jump-to-section search for /docs. The docs are one page, so this filters
 * the section list rather than querying an index: type "feed" and the
 * matching sections appear as anchor links. Nothing is hidden from crawlers
 * -- every section stays in the server-rendered page.
 */
export function DocsSearch({ entries }: { entries: DocsSearchEntry[] }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries.filter((entry) => `${entry.title} ${entry.keywords}`.toLowerCase().includes(q));
  }, [entries, query]);

  return (
    <div className="relative w-full max-w-xl">
      <label htmlFor={inputId} className="sr-only">
        Search the documentation
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search the docs — e.g. feed, offline, team"
        autoComplete="off"
        aria-controls={listId}
        className="min-h-12 w-full rounded-xl border border-input bg-surface pl-11 pr-4 text-base shadow-card placeholder:text-muted-foreground md:text-sm"
      />
      <div id={listId} aria-live="polite">
        {query.trim() && (
          <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-pop">
            {matches.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">No matching sections.</li>
            ) : (
              matches.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    onClick={() => setQuery("")}
                    className="flex min-h-11 items-center px-4 text-sm font-medium text-foreground hover:bg-section"
                  >
                    {entry.title}
                  </a>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
