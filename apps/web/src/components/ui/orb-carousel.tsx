"use client";

import { AVATARS, type AvatarCode } from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";

import { avatarSrc } from "@/components/ui/orb";

// Diameter by distance from the pick: it is enlarged and centred, the rest
// shrink away on either side. `compact` is for a phone and the Settings.
const SIZES = {
  large: [176, 124, 96, 80, 70, 64],
  compact: [124, 80, 58, 48, 42, 38],
};

const n = AVATARS.length;
const HALF = Math.floor(n / 2);

/**
 * Every Avatar in a row that wraps around, so the picked one always sits in
 * the middle with its number and name on it ("04 · Onyx"). Radios for
 * assistive tech; the arrow keys step through them.
 */
export function OrbCarousel({
  value,
  onChange,
  compact,
}: {
  value: AvatarCode;
  onChange: (value: AvatarCode) => void;
  compact: boolean;
}) {
  const t = useTranslations("onboarding");
  const tAvatar = useTranslations("avatars");
  const rtl = useLocale() === "he";
  const selected = AVATARS.indexOf(value);
  const sizes = compact ? SIZES.compact : SIZES.large;

  const at = (offset: number) => AVATARS[(((selected + offset) % n) + n) % n]!;

  function onKeyDown(e: KeyboardEvent) {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    const step = e.key === forward ? 1 : e.key === backward ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const group = e.currentTarget as HTMLElement;
    onChange(at(step));
    // Keep focus on the pick, which is always the middle button.
    requestAnimationFrame(() =>
      group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
    );
  }

  return (
    // Wider than its box on purpose: the far orbs run off both edges.
    <div className="flex w-full justify-center overflow-hidden py-6">
      <div
        role="radiogroup"
        aria-label={t("avatarLabel")}
        onKeyDown={onKeyDown}
        className={cn("flex shrink-0 items-center", compact ? "gap-2.5" : "gap-5")}
      >
        {Array.from({ length: n }, (_, i) => i - HALF).map((offset) => {
          const code = at(offset);
          const picked = offset === 0;
          const size = sizes[Math.abs(offset)]!;
          const number = String(AVATARS.indexOf(code) + 1).padStart(2, "0");
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={picked}
              aria-label={`${number} · ${tAvatar(code)}`}
              tabIndex={picked ? 0 : -1}
              onClick={() => onChange(code)}
              style={{ width: size, height: size }}
              className={cn(
                "relative shrink-0 rounded-full outline-offset-4 transition-[width,height,opacity,box-shadow] duration-300 ease-out-quint motion-reduce:transition-none",
                "focus-visible:outline-2 focus-visible:outline-ring",
                picked
                  ? "shadow-[0_24px_50px_rgba(0,0,0,.28)]"
                  : "shadow-[0_8px_18px_rgba(0,0,0,.12)]",
                Math.abs(offset) >= 3 && "opacity-80",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a fixed set of small local images */}
              <img
                src={avatarSrc(code, size > 96 ? "full" : "sm")}
                alt=""
                draggable={false}
                className="block size-full rounded-full"
              />
              {picked && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white [text-shadow:0_1px_8px_rgba(0,0,0,.45)]">
                  <span
                    className={cn(
                      "grid place-items-center rounded-full border border-white/75 text-xs tabular-nums",
                      compact ? "size-7" : "size-9",
                    )}
                  >
                    {number}
                  </span>
                  <span className={compact ? "text-sm" : "text-lg"}>
                    {tAvatar(code)}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
