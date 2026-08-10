"use client";

import { Badge } from "@repo/ui/components/badge";
import {
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  Contrast,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Status badges.
 *
 * Two axes sit side by side in one cell, so only one of them may be loud.
 *
 * **Payment is the loud one** — it carries a hue and a glyph, because "who
 * still owes me" is the question the list gets opened for. The tints are the
 * scoped exception to the monochrome theme (see the note atop `globals.css`);
 * they are translucent fills, never solid, and never the destructive red.
 *
 * **Fulfilment is the quiet one** — neutral chip, icon only. It stays legible
 * without competing for the same glance.
 *
 * Both carry an icon *and* a text label, so hue is never the only signal.
 */

type Chip = { variant: "positive" | "caution" | "critical"; Icon: LucideIcon };

/** alert → half-filled → complete: one circle family, read as a fill progression */
const PAYMENT: Record<string, Chip> = {
  unpaid: { variant: "critical", Icon: CircleAlert },
  partial: { variant: "caution", Icon: Contrast },
  paid: { variant: "positive", Icon: CircleCheck },
};

export function PaymentBadge({ status }: { status: string }) {
  const t = useTranslations("payment");
  const chip = PAYMENT[status];
  return (
    <Badge variant={chip?.variant ?? "secondary"}>
      {chip ? <chip.Icon aria-hidden /> : null}
      {t(status)}
    </Badge>
  );
}

// Status codes live in the DB so stages can be added without code changes —
// an unmapped code must degrade to a plain label, not crash.
const STATUS: Record<string, { variant: "secondary" | "outline"; Icon: LucideIcon }> = {
  not_done: { variant: "secondary", Icon: Clock },
  // A bare check, not CircleCheck: that glyph belongs to "Paid", and the two
  // chips sit adjacent.
  done: { variant: "outline", Icon: Check },
};

export function OrderStatusBadge({ code }: { code: string }) {
  const t = useTranslations("status");
  const chip = STATUS[code];
  return (
    <Badge variant={chip?.variant ?? "secondary"}>
      {chip ? <chip.Icon aria-hidden /> : null}
      {t(code)}
    </Badge>
  );
}
