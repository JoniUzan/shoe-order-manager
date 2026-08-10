"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@repo/ui/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Tracks the active trigger's box so the pill can travel to it instead of
 * teleporting. Measured rather than computed: `flex-1` inside a `w-fit` list
 * leaves the triggers at their label widths (a ~30px spread across All /
 * Open / Unpaid), so there is no CSS-only expression for where the pill goes.
 */
function useActiveTriggerBox(ref: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = React.useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)

  React.useEffect(() => {
    const list = ref.current
    if (!list) return

    const measure = () => {
      const active = list.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-state="active"]'
      )
      if (!active) return setBox(null)
      const lr = list.getBoundingClientRect()
      const ar = active.getBoundingClientRect()
      // Physical offsets, paired with a physical translate below: `transform`
      // is not direction-aware, so measuring physically is what makes this
      // land correctly in RTL too.
      setBox({ x: ar.left - lr.left, y: ar.top - lr.top, w: ar.width, h: ar.height })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    for (const t of list.querySelectorAll('[data-slot="tabs-trigger"]')) ro.observe(t)
    // Radix flips data-state in place without remounting, so the attribute is
    // the only signal that the selection moved.
    const mo = new MutationObserver(measure)
    mo.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [ref])

  return box
}

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const box = useActiveTriggerBox(ref)
  // The pill must not slide in from the origin on first paint; it only starts
  // animating on the frame after it has been placed.
  const [travels, setTravels] = React.useState(false)
  React.useEffect(() => {
    if (!box || travels) return
    const id = requestAnimationFrame(() => setTravels(true))
    return () => cancelAnimationFrame(id)
  }, [box, travels])

  const sliding = variant === "default" && box !== null

  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      data-variant={variant}
      // Suppresses the trigger's own pill once this one is in play. Until then
      // — SSR, or before hydration — the static pill is what renders, so the
      // control is never briefly unmarked.
      data-sliding={sliding || undefined}
      className={cn(tabsListVariants({ variant }), "relative", className)}
      {...props}
    >
      {sliding ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 rounded-md bg-background shadow-sm",
            "dark:border dark:border-input dark:bg-input/30",
            // Width and height are layout properties, but this element is
            // absolutely positioned — nothing else reflows behind it.
            travels &&
              "transition-[transform,width,height] duration-200 ease-out-quint",
            "motion-reduce:transition-none"
          )}
          style={{
            transform: `translate(${box.x}px, ${box.y}px)`,
            width: box.w,
            height: box.h,
          }}
        />
      ) : null}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-[color,background-color,box-shadow] duration-150 ease-out group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        // When the list paints a travelling pill, the trigger stops painting a
        // static one — otherwise the mark is drawn twice mid-slide. The label
        // colour still crossfades here, so the two tabs trade emphasis while
        // the pill is in transit.
        // Marked important: the rules being cancelled carry the same variant
        // count, so without it the winner is decided by Tailwind's utility
        // ordering rather than by intent.
        "group-data-[sliding]/tabs-list:data-[state=active]:bg-transparent! group-data-[sliding]/tabs-list:data-[state=active]:shadow-none! dark:group-data-[sliding]/tabs-list:data-[state=active]:border-transparent! dark:group-data-[sliding]/tabs-list:data-[state=active]:bg-transparent!",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
