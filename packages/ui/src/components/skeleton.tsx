import { cn } from "@repo/ui/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Local change: --skeleton instead of bg-accent (globals.css), and no
        // pulse for a User who asks for reduced motion.
        "animate-pulse rounded-md bg-skeleton motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
