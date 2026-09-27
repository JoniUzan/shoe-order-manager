"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Phone vs computer for the settings — a drawer and a section menu, or a
 * dialog with a side menu. Unlike `useIsMobile`, a client navigation gets the
 * right answer on the first render, so the dialog doesn't flash open as the
 * wrong one before switching.
 */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
