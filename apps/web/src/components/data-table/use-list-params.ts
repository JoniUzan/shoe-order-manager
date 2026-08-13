"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Keeps a list screen's state in the URL.
 *
 * The list itself never filters, sorts or pages: it patches the URL, the server
 * re-runs the query, and the new rows arrive as props. The search box is the one
 * control that can't wait for that round trip, so it holds its own value and
 * pushes the debounced one up.
 */
export function useListParams<P extends { q: string; page: number }>(
  params: P,
  toQuery: (p: P) => string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (patch: Partial<P>) => {
      const next = { ...params, ...patch } as P;
      // Anything that changes *which* rows match sends you back to page 1 —
      // otherwise a narrowing search strands you on an empty page 8.
      if (patch.page === undefined) next.page = 1;
      const qs = toQuery(next);
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router, toQuery],
  );

  const [search, setSearch] = useState(params.q);
  const debounced = useDebouncedValue(search, 300);
  // What we last handed to the URL, so the two effects below can't chase
  // each other: one pushes typing up, the other pulls external changes down.
  const lastPushed = useRef(params.q);

  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    setParams({ q: debounced } as Partial<P>);
  }, [debounced, setParams]);

  useEffect(() => {
    if (params.q !== lastPushed.current) {
      lastPushed.current = params.q;
      setSearch(params.q);
    }
  }, [params.q]);

  return {
    setParams,
    isPending,
    /** Shared with the caller so an optimistic value can ride the same transition. */
    startTransition,
    search,
    setSearch,
    /** Changes whenever the visible set of rows does — a reset key for per-view state. */
    viewKey: toQuery(params),
  };
}
