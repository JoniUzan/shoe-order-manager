"use client";

import { useEffect } from "react";

/**
 * Keeps Next's router on the URL's hash when the browser changes it by
 * itself: a link or a typed URL that differs only in the hash
 * (`/he` → `/he#settings/account`) is a fragment navigation, which Next never
 * sees. Its router keeps the old URL, and the next refresh (the one a Server
 * Action's `revalidatePath` triggers) writes that URL back, dropping the hash
 * and closing whatever dialog it opened (#39).
 *
 * The browser gives such an entry no state, so it isn't one of Next's (no
 * `__NA`). Replacing it with `null` state hands the URL to Next's patched
 * `replaceState`, which adopts it into the router, as it does for the
 * settings and welcome hash helpers. Next's own entries (Back onto one) it
 * restores itself.
 */
export function HashSync() {
  useEffect(() => {
    const adopt = () => {
      const state = window.history.state as { __NA?: boolean } | null;
      if (state?.__NA) return;
      window.history.replaceState(null, "", window.location.href);
    };
    window.addEventListener("hashchange", adopt);
    return () => window.removeEventListener("hashchange", adopt);
  }, []);
  return null;
}
