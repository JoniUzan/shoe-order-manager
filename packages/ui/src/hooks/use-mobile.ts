"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Whether the window is phone-sized right now (read outside React). */
export function isMobileNow() {
  return window.matchMedia(QUERY).matches;
}

/**
 * Phone vs computer. The server and the hydrating render say computer; a phone
 * then re-renders only the components that call this hook. Keep it out of a
 * context provider's value: a provider that changes while a Suspense boundary
 * below it is still streaming makes React drop that boundary's server HTML and
 * render it again on the client.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, isMobileNow, () => false);
}
