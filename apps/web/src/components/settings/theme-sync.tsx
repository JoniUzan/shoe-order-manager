"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * next-themes keeps the theme per device (localStorage). On each full load of
 * the app this applies the one saved on the account instead, so a phone opens
 * in the theme picked on the laptop.
 */
export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  return null;
}
