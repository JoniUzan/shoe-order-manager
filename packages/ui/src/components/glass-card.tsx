"use client"

import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@repo/ui/lib/utils"

/**
 * A card made of glass (`.glass-card` in globals.css): the dashboard's
 * material. `pressable` gives a link card the press-and-settle; `materialize`
 * fades it in once, `stagger` places it in a row of them. The specular
 * highlight follows a mouse, never a touch.
 */
function GlassCard({
  className,
  asChild = false,
  pressable = false,
  materialize = false,
  stagger,
  style,
  onPointerMove,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
  pressable?: boolean
  materialize?: boolean
  stagger?: number
}) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="glass-card"
      data-pressable={pressable || undefined}
      className={cn("glass-card", materialize && "glass-materialize", className)}
      style={{ ...style, ...(stagger ? { "--stagger": stagger } : {}) } as React.CSSProperties}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
        onPointerMove?.(e)
        if (e.pointerType !== "mouse") return
        const box = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty("--spec-x", `${e.clientX - box.left}px`)
        e.currentTarget.style.setProperty("--spec-y", `${e.clientY - box.top}px`)
      }}
      {...props}
    />
  )
}

export { GlassCard }
