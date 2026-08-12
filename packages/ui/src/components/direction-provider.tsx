"use client"

import { Direction } from "radix-ui"
import type { ReactNode } from "react"

/**
 * Supplies the reading direction to every Radix primitive below it.
 *
 * Radix does not read `<html dir>` — each primitive reads this context and
 * falls back to ltr. Portalled content is where it shows: a popover or command
 * list renders outside the RTL subtree entirely, so its scrollbar lands on the
 * wrong edge, leading icons reserve space on the wrong side, and arrow-key
 * navigation runs backwards. Mount this once, at the root, beside the theme
 * provider.
 */
function DirectionProvider({
  dir,
  children,
}: {
  dir: "ltr" | "rtl"
  children: ReactNode
}) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>
}

export { DirectionProvider }
