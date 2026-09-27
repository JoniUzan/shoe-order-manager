"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * next-themes keeps the theme per device (localStorage). On each full load of
 * the app this applies the one saved on the account instead, so a phone opens
 * in the theme picked on the laptop.
 *
 * Once per load only: `setTheme` changes identity on every theme change, and
 * re-running then would put back the saved (old) theme until the save's
 * revalidation arrives — a dark → light → dark flicker. Changes made in the
 * app already call `setTheme` themselves.
 */
export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    setTheme(theme);
  }, [theme, setTheme]);

  return null;
}
