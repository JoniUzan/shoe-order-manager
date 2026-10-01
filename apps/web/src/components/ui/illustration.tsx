import Image from "next/image";

import { cn } from "@repo/ui/lib/utils";

/**
 * The step illustrations: clay pictures beside a form step's title and in
 * empty states. Like the orbs they are pictures, not colour — they never carry
 * meaning, so they are always `alt=""` and may use colours outside the tokens.
 * The files and where each came from are in `public/illustrations/README.md`.
 */
export const ILLUSTRATIONS = ["shoe-box", "store", "checklist", "sneaker", "carton"] as const;
export type IllustrationName = (typeof ILLUSTRATIONS)[number];

export function Illustration({
  name,
  className,
}: {
  name: IllustrationName;
  className?: string;
}) {
  return (
    <Image
      src={`/illustrations/${name}.webp`}
      alt=""
      width={384}
      height={384}
      // Above the fold beside a step title: don't wait for the lazy observer.
      loading="eager"
      className={cn("size-26 shrink-0 select-none object-contain md:size-32", className)}
    />
  );
}
