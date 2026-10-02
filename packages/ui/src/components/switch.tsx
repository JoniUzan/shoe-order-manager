"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@repo/ui/lib/utils"

// Local changes: on is ink, not --primary (the teal is for the one action on
// a screen, see globals.css); the thumb slides toward the end edge in RTL too;
// and an `lg` size for the roomier forms.
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default" | "lg"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[size=lg]:h-7 data-[size=lg]:w-12 data-[size=lg]:px-0.5 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ease-out-quint group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=lg]/switch:size-6 data-[state=checked]:translate-x-[calc(100%-2px)] rtl:data-[state=checked]:-translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 group-data-[size=lg]/switch:data-[state=checked]:translate-x-[calc(100%-6px)] rtl:group-data-[size=lg]/switch:data-[state=checked]:-translate-x-[calc(100%-6px)] dark:data-[state=unchecked]:bg-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
