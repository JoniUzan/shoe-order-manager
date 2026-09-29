"use client";

import { AVATARS, type AvatarCode } from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";

import { avatarSrc } from "@/components/ui/orb";

// Diameter by distance from the pick: it is enlarged and centred, the rest
// shrink away on either side. `compact` is for a phone and the Settings.
const SIZES = {
  large: [176, 124, 96, 80, 70, 64],
  compact: [124, 80, 58, 48, 42, 38],
};
const GAP = { large: 20, compact: 10 };

// The pick fades in over the far ones, and the outermost slot is empty: an
// orb wrapping from one end to the other goes through there, unseen.
const OPACITY = [1, 1, 1, 0.8, 0.5, 0];

const n = AVATARS.length;
const NONE: ReadonlySet<number> = new Set();
const NO_LEAVING: ReadonlyMap<number, number> = new Map();
/** How long a wrapping orb takes to fade out before it jumps. */
const FADE_MS = 150;
const HALF = Math.floor(n / 2);

/** `k` folded into the ring's slots, -HALF…HALF. */
const wrap = (k: number) => ((((k + HALF) % n) + n) % n) - HALF;

/** Each slot's centre, from the middle, in px (positive = forward). */
function slotCentres(sizes: number[], gap: number) {
  const centres = [0];
  for (let d = 1; d <= HALF; d++) {
    centres[d] = centres[d - 1]! + sizes[d - 1]! / 2 + gap + sizes[d]! / 2;
  }
  return centres;
}

/**
 * Every Avatar in a ring, the picked one enlarged in the middle with its
 * number and name on it ("04 · Onyx"). Radios for assistive tech; the arrow
 * keys step through them.
 *
 * The orbs never change order in the DOM: each is one fixed-size element
 * placed by `transform` (slide + scale), so a pick slides the whole ring on
 * the GPU. An orb that wraps round (the far left becoming the far right)
 * never flies back across the row: it fades out where it is, jumps while
 * invisible, then fades in at its new place.
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
  const base = sizes[0]!;
  const centres = slotCentres(sizes, compact ? GAP.compact : GAP.large);

  // An orb that wraps goes through three phases: `leaving` (fading out in
  // its old slot), `placing` (moved to its new slot with no transition,
  // still invisible), then back to normal, fading in. State rather than
  // refs, since it drives the render.
  const [prev, setPrev] = useState(selected);
  // `leaving` maps each such orb to the pick it is still drawn against, so a
  // quick second pick doesn't move one that hasn't finished fading out.
  const [leaving, setLeaving] = useState<ReadonlyMap<number, number>>(NO_LEAVING);
  const [placing, setPlacing] = useState<ReadonlySet<number>>(NONE);
  if (selected !== prev) {
    const step = wrap(selected - prev);
    const nextLeaving = new Map(leaving);
    for (let i = 0; i < n; i++) {
      if (leaving.has(i) || placing.has(i)) continue; // already invisible or on its way
      if (wrap(i - prev) - step !== wrap(i - selected)) nextLeaving.set(i, prev);
    }
    setPrev(selected);
    setLeaving(nextLeaving);
  }
  useEffect(() => {
    if (leaving.size === 0) return;
    const id = setTimeout(() => {
      setPlacing((p) => new Set([...p, ...leaving.keys()]));
      setLeaving(NO_LEAVING);
    }, FADE_MS);
    return () => clearTimeout(id);
  }, [leaving]);
  useEffect(() => {
    if (placing.size === 0) return;
    // Two frames: the jump must be painted before the transition returns.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPlacing(NONE));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [placing]);

  const at = (offset: number) => AVATARS[(((selected + offset) % n) + n) % n]!;

  function onKeyDown(e: KeyboardEvent) {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    const step = e.key === forward ? 1 : e.key === backward ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const group = e.currentTarget as HTMLElement;
    onChange(at(step));
    // Keep focus on the pick.
    requestAnimationFrame(() =>
      group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
    );
  }

  const number = String(selected + 1).padStart(2, "0");
  // Forward runs toward the end of the line: right in English, left in Hebrew.
  const dir = rtl ? -1 : 1;
  // Only the ring's middle is fully visible; the ends fade into the dialog.
  const edgeFade =
    "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)";

  return (
    // Clipped: the far slots sit past the edges, and would otherwise make
    // whatever holds the carousel scroll sideways. Not selectable: a drag
    // or a select-all would paint the orbs as blue squares.
    <div
      className="relative w-full overflow-hidden select-none [-webkit-tap-highlight-color:transparent]"
      style={{
        height: base + 48,
        maskImage: edgeFade,
        WebkitMaskImage: edgeFade,
      }}
    >
      <div
        role="radiogroup"
        aria-label={t("avatarLabel")}
        onKeyDown={onKeyDown}
        className="absolute inset-0"
      >
        {AVATARS.map((code, i) => {
          const from = leaving.get(i);
          const isLeaving = from !== undefined;
          const isPlacing = placing.has(i);
          const offset = wrap(i - (from ?? selected));
          const distance = Math.abs(offset);
          const picked = i === selected;
          const x = Math.sign(offset) * centres[distance]! * dir;
          const style: CSSProperties = {
            width: base,
            height: base,
            marginLeft: -base / 2,
            marginTop: -base / 2,
            transform: `translateX(${x}px) scale(${sizes[distance]! / base})`,
            opacity: isLeaving || isPlacing ? 0 : OPACITY[distance],
            // A far orb stays clickable but under the nearer ones.
            zIndex: HALF - distance,
          };
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={picked}
              aria-label={`${String(i + 1).padStart(2, "0")} · ${tAvatar(code)}`}
              tabIndex={picked ? 0 : -1}
              // The empty outer slot is not a target.
              disabled={distance === HALF}
              onClick={() => onChange(code)}
              style={style}
              className={cn(
                "group absolute top-1/2 left-1/2 rounded-full outline-offset-4",
                "focus-visible:outline-2 focus-visible:outline-ring",
                isPlacing
                  ? "transition-none"
                  : isLeaving
                    ? "transition-opacity duration-150 ease-out"
                    : "transition-[transform,opacity] duration-[360ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
                // Reduced motion: no sliding, the fades stay.
                "motion-reduce:transition-opacity",
              )}
            >
              {/* The press feedback, on its own layer: the button's transform is its position. */}
              <span className="block size-full rounded-full transition-transform duration-150 ease-out group-active:scale-[0.97]">
                {/* eslint-disable-next-line @next/next/no-img-element -- a fixed set of small local images */}
                <img
                  src={avatarSrc(code, "md")}
                  alt=""
                  draggable={false}
                  className="block size-full"
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* The pick's number and name, over the middle orb. Keyed by the pick,
          so each change fades in with a slight blur rather than swapping. */}
      <span
        key={value}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-1/2 flex-col items-center justify-center gap-2 text-white [text-shadow:0_1px_8px_rgba(0,0,0,.45)]",
          "transition-[opacity,filter] delay-75 duration-200 ease-out starting:opacity-0 starting:blur-[2px]",
        )}
      >
        <span
          className={cn(
            "grid place-items-center rounded-full border border-white/75 text-xs tabular-nums",
            compact ? "size-7" : "size-9",
          )}
        >
          {number}
        </span>
        <span className={compact ? "text-sm" : "text-lg"}>{tAvatar(value)}</span>
      </span>
    </div>
  );
}
