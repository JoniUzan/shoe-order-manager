"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LIST_PARAM_KEYS } from "@/lib/list-params";

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
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.q);
  const debounced = useDebouncedValue(search, 300);
  // What we last handed to the URL, so the two effects below can't chase
  // each other: one pushes typing up, the other pulls external changes down.
  const lastPushed = useRef(params.q);

  const setParams = useCallback(
    (patch: Partial<P>) => {
      const next = { ...params, ...patch } as P;
      // Anything that changes *which* rows match sends you back to page 1 —
      // otherwise a narrowing search strands you on an empty page 8.
      if (patch.page === undefined) next.page = 1;
      // A caller that sets `q` directly (clearing the filters, say) has already
      // said what the search is. Without this the debounce would notice the
      // discrepancy 300ms later and navigate a second time to the same value.
      if (patch.q !== undefined) {
        lastPushed.current = patch.q;
        setSearch(patch.q);
      }
      // `toQuery` only knows the list's own keys. Anything else in the URL is
      // the page's — the reports screen keeps `tab` and `customer` there — so
      // it rides along, otherwise the first sort would drop you back to the
      // default tab.
      const merged = new URLSearchParams();
      for (const [k, v] of searchParams.entries()) {
        if (!LIST_PARAM_KEYS.has(k)) merged.append(k, v);
      }
      for (const [k, v] of new URLSearchParams(toQuery(next))) {
        merged.set(k, v);
      }
      const qs = merged.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router, searchParams, toQuery],
  );

  useEffect(() => {
    // `debounced` trails `search` by 300ms, so on its own it can't tell "the
    // user stopped typing" from "the value was just replaced under it". Only
    // the first is ours to push; without this guard, clearing the search would
    // navigate once immediately and then a second time back to the old text.
    if (debounced !== search) return;
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    setParams({ q: debounced } as Partial<P>);
  }, [debounced, search, setParams]);

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
