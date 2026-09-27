"use client";

import type { ComponentProps } from "react";

import type { SettingsSection } from "@/lib/settings-sections";

import { showSettingsSection } from "./settings-hash";

/**
 * A link to a settings section (or, with `null`, the phone's section menu).
 * A real `#settings/…` href, so it reads and copies as a link; clicking it
 * swaps the hash in place — no navigation, no new history entry.
 */
export function SectionLink({
  section,
  onClick,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { section: SettingsSection | null }) {
  return (
    <a
      {...props}
      href={section ? `#settings/${section}` : "#settings"}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        showSettingsSection(section);
      }}
    />
  );
}
