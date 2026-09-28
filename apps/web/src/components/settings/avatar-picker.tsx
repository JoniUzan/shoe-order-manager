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

  useEffect(() => () => clearTimeout(timer.current), []);

  function pick(next: AvatarCode) {
    setAvatar(next);
    onChange?.(next);
    // Arrow keys fly through the orbs; save only the one they stop on.
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await updateAvatar({ avatar: next });
      if (!res.ok) toast.error(t("errorGeneric"));
    }, 400);
  }

  return <OrbCarousel value={avatar} onChange={pick} compact={compact} />;
}
