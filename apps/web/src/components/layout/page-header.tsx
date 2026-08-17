import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    // Wraps rather than overflows: three actions (edit, share, delete) beside a
    // title do not fit a 390px phone, and `shrink-0` on the action box means
    // something has to give. Letting the row wrap puts them on their own line.
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {/* `shrink-0` keeps the buttons at full size beside the title; `max-w-full`
          is what lets the action row itself wrap once it is alone on its line —
          without it the box keeps its content width and pushes past the phone. */}
      {action && <div className="max-w-full shrink-0">{action}</div>}
    </div>
  );
}
