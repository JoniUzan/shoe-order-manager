import { cn } from "@repo/ui/lib/utils";

/**
 * A Shoe model's square in the order form, holding the place of its Product
 * image until uploads land: a quiet shoe outline on the surface colour.
 */
export function ModelThumb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-[0.875rem] border border-border bg-surface text-muted-foreground md:size-16",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[45%] opacity-70"
      >
        <path d="M3 7.5V17h18v-1.6a2.4 2.4 0 0 0-1.8-2.3l-4.4-1.2-3-4.4H9.6L8.5 9.8C7 10 5 9.4 3 7.5z" />
        <path d="M3 17v1.5h18V17" />
        <path d="M11.6 10l-1.3 1.2M13 12l-1.3 1.2" />
      </svg>
    </div>
  );
}
