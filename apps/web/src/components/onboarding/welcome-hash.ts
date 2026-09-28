"use client";

import { useSyncExternalStore } from "react";

/**
 * The welcome dialog's step lives in the URL hash — `#welcome/yours` — so a
 * reload, or the full load a language change makes, reopens it on the same
 * step. Changed only through `history.replaceState`, never `location.hash =`
 * (see `settings-hash.ts` for why Next needs that), and with `null` state:
 * Next only takes the new URL into its router when the state isn't its own,
 * and otherwise writes its stale one back after the next server action.
 * Steps replace each other rather than stacking up history: Back is the
 * dialog's own button.
 */

export const WELCOME_STEPS = ["language", "yours", "business"] as const;

export type WelcomeStep = (typeof WELCOME_STEPS)[number];

const EVENT = "welcome-hash";
const PREFIX = "#welcome/";

/** The step in the hash, or `null` when the hash isn't a welcome step. */
export function parseWelcomeHash(hash: string): WelcomeStep | null {
  if (!hash.startsWith(PREFIX)) return null;
  const step = hash.slice(PREFIX.length);
  return (WELCOME_STEPS as readonly string[]).includes(step)
    ? (step as WelcomeStep)
    : null;
}

function replaceHash(hash: string) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}${hash}`);
  window.dispatchEvent(new Event(EVENT));
}

export function showWelcomeStep(step: WelcomeStep) {
  replaceHash(`${PREFIX}${step}`);
}

export function clearWelcomeHash() {
  replaceHash("");
}

/** The URL for the same page and step in another language. */
export function welcomeUrlIn(locale: string, step: WelcomeStep) {
  const { pathname, search } = window.location;
  const rest = pathname.replace(/^\/(he|en)(?=\/|$)/, "");
  return `/${locale}${rest}${search}${PREFIX}${step}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

/** The current step; `null` before hydration or when the hash has none. */
export function useWelcomeStep(): WelcomeStep | null {
  return useSyncExternalStore(
    subscribe,
    () => parseWelcomeHash(window.location.hash),
    () => null,
  );
}
