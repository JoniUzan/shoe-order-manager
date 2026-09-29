"use client";

import type { AvatarCode } from "@repo/domain";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { OrbCarousel } from "@/components/ui/orb-carousel";
import { updateAvatar } from "@/lib/actions/settings";

/**
 * The orb carousel, saving the pick to the account — in Settings → Account
 * and the welcome dialog. `onChange` lets the dialog's name pill follow it.
 */
export function AvatarPicker({
  defaultValue,
  compact,
  onChange,
}: {
  defaultValue: AvatarCode;
  compact: boolean;
  onChange?: (avatar: AvatarCode) => void;
}) {
  const t = useTranslations("settings");
  const [avatar, setAvatar] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The pick still waiting for its debounced save, if any.
  const pending = useRef<AvatarCode | null>(null);

  async function save(avatar: AvatarCode) {
    pending.current = null;
    const res = await updateAvatar({ avatar });
    if (!res.ok) toast.error(t("errorGeneric"));
  }

  // Leaving (Continue, closing the section) saves a pick still waiting out
  // the debounce, rather than dropping it.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) void save(pending.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
    [],
  );

  function pick(next: AvatarCode) {
    setAvatar(next);
    onChange?.(next);
    // Arrow keys fly through the orbs; save only the one they stop on.
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 400);
  }

  return <OrbCarousel value={avatar} onChange={pick} compact={compact} />;
}
