import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * A ranking as horizontal bars: each row's name, a bar as long as its share
 * of the first row, and its value. One series, so one hue (`fill`).
 */
export function RankBars({
  title,
  description,
  empty,
  fill,
  rows,
}: {
  title: string;
  description: string;
  empty: string;
  fill: string;
  rows: { id: string; name: string; value: number; label: ReactNode }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="surface-raised flex flex-col gap-2 rounded-card bg-card px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-0.5 pb-1.5">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li
              key={r.id}
              className="grid h-8.5 grid-cols-[minmax(0,8rem)_minmax(0,1fr)_4.5rem] items-center gap-3"
            >
              <span className="truncate">{r.name}</span>
              <span className="h-3.5">
                <span
                  className={cn("block h-full rounded-[4px]", fill)}
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </span>
              <span className="text-end font-semibold tabular-nums">{r.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
