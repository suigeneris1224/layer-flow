"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/field";

/**
 * Debounced, URL-driven search box for /admin's farm table.
 *
 * Matches the codebase's existing url-searchParams-as-state idiom
 * (components/reports/range-picker.tsx) rather than filtering client-side --
 * the page's server component re-filters the full farm list on every
 * navigation, which is what makes search reach every farm and not just
 * whatever's on the current page.
 *
 * Debounced (not on-submit) because unlike a chip/select, a text field
 * fires this on every keystroke; `replace` (not `push`) so typing doesn't
 * fill browser history with one entry per keystroke.
 */
export function FarmSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      const query = params.toString();
      router.replace((query ? `/admin?${query}` : "/admin") as Route);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Search by farm name or owner email…"
      aria-label="Search farms"
      adornment={<Search className="size-4" aria-hidden />}
      className="sm:w-80"
    />
  );
}
