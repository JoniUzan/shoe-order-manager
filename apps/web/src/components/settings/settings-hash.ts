"use client";

import { useSyncExternalStore } from "react";

import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "@/lib/settings-sections";

/**
 * The settings dialog lives in the URL hash of whatever page is open —
 * `/he/orders#settings/account`, the way claude.ai does `/new#settings/account`.
 * A reload reopens it over the same page, a link opens it, Back closes it,
 * and switching sections never navigates (Next treats a hash as page state).
 *
 * Changes go through `history.pushState`/`replaceState`, not `location.hash`:
 * Next keeps its own router state in the history entry when those are called,
 * whereas an entry the browser creates for a bare hash change has none, and
 * Next reloads the page when Back lands on such an entry.
 */

export type SettingsHash = { open: false } | { open: true; section: SettingsSection | null };

const EVENT = "settings-hash";
const PREFIX = "#settings";

export function parseSettingsHash(hash: string): SettingsHash {
  if (hash !== PREFIX && !hash.startsWith(`${PREFIX}/`)) return { open: false };
  const rest = hash.slice(PREFIX.length + 1);
  const section = (SETTINGS_SECTIONS as readonly string[]).includes(rest)
    ? (rest as SettingsSection)
    : null;
  return { open: true, section };
}

function hashFor(section: SettingsSection | null) {
  return section ? `${PREFIX}/${section}` : PREFIX;
}

function urlWithHash(hash: string) {
  const { pathname, search } = window.location;
  return `${pathname}${search}${hash}`;
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

// Whether this tab opened the dialog itself (so closing can step back off
// the entry it pushed) or arrived with the hash already there (a reload or
// a link — closing then just clears it, not leave the page).
let pushedByUs = false;

/** Open the settings over the current page. */
export function openSettings(section: SettingsSection | null = null) {
  window.history.pushState(null, "", urlWithHash(hashFor(section)));
  pushedByUs = true;
  notify();
}

/** Switch section inside the open dialog — no new history entry. */
export function showSettingsSection(section: SettingsSection | null) {
  window.history.replaceState(null, "", urlWithHash(hashFor(section)));
  notify();
}

export function closeSettings() {
  if (pushedByUs) {
    pushedByUs = false;
    window.history.back(); // popstate → subscribers re-read the hash
    return;
  }
  window.history.replaceState(null, "", urlWithHash(""));
  notify();
}

function subscribe(onChange: () => void) {
  const onPop = () => {
    // Back/Forward moved off (or onto) a settings entry by hand.
    if (!parseSettingsHash(window.location.hash).open) pushedByUs = false;
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("popstate", onPop);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("popstate", onPop);
    window.removeEventListener("hashchange", onChange);
  };
}

/** The raw hash, re-read on every settings change and Back/Forward. */
export function useLocationHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
}
