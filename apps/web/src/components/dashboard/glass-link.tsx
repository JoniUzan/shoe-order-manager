"use client";

import { GlassCard } from "@repo/ui/components/glass-card";
import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";

/**
 * A glass card that is a link. Built here, on the client: Slot can't merge
 * onto a Link element a server component made, which arrives as a reference.
 */
export function GlassLink({
  stagger,
  ...props
}: ComponentProps<typeof Link> & { stagger?: number }) {
  return (
    <GlassCard asChild pressable materialize stagger={stagger}>
      <Link {...props} />
    </GlassCard>
  );
}
