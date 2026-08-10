import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@repo/ui/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        success:
          "bg-success text-success-foreground [a&]:hover:bg-success/90",
        warning:
          "bg-warning text-warning-foreground [a&]:hover:bg-warning/90",
        // Tinted status readouts, not controls: no border, no hover. The fill
        // is translucent so it layers on the glass; the ink carries contrast.
        // The inset highlight is a hard 1px edge, not a gradient — across a
        // 20px pill a soft ramp on a 12% tint reads as banding, an edge reads
        // as light catching the material. On a fully-rounded pill it follows
        // the top arc and wraps the corners.
        positive:
          "bg-tint-positive text-tint-positive-foreground shadow-[inset_0_1px_0_var(--sheen-chip)]",
        caution:
          "bg-tint-caution text-tint-caution-foreground shadow-[inset_0_1px_0_var(--sheen-chip)]",
        critical:
          "bg-tint-critical text-tint-critical-foreground shadow-[inset_0_1px_0_var(--sheen-chip)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
