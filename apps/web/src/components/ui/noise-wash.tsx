import { cn } from "@repo/ui/lib/utils";
import { useId } from "react";

/**
 * The sign-up page's and the welcome dialog's ground: a blurred wash of the
 * app's teal and a warm amber, rising from the lower corners. The noise masks
 * the colour itself (`feComposite in`), so the band edges break into specks —
 * it is not a grain layer laid over a gradient. Full strength in dark mode,
 * about 60% on the light paper. Nothing is meant to sit on top of it.
 */
export function NoiseWash({ className }: { className?: string }) {
  // Two can be on screen at once (the page and a dialog), and filter ids are
  // document-global.
  const id = `wash${useId().replace(/:/g, "")}`;
  const teal = "fill-[#4fa9b5] dark:fill-[#1f9aaa]";
  const amber = "fill-[#d6a868] dark:fill-[#c08a4a]";

  return (
    <svg
      viewBox="0 0 1280 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 size-full opacity-60 dark:opacity-95",
        className,
      )}
    >
      <filter
        id={id}
        filterUnits="userSpaceOnUse"
        x="-200"
        y="-200"
        width="1680"
        height="1200"
      >
        <feGaussianBlur in="SourceGraphic" stdDeviation="70" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0"
          result="soft"
        />
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves="2"
          seed="7"
          stitchTiles="stitch"
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -1.2"
          result="mask"
        />
        <feComposite in="blur" in2="mask" operator="in" result="speck" />
        <feMerge>
          <feMergeNode in="soft" />
          <feMergeNode in="speck" />
        </feMerge>
      </filter>
      <g filter={`url(#${id})`}>
        <ellipse cx="200" cy="640" rx="430" ry="170" transform="rotate(-18 200 640)" className={teal} />
        <ellipse cx="1190" cy="360" rx="300" ry="200" transform="rotate(-30 1190 360)" className={teal} />
        <ellipse cx="1060" cy="800" rx="430" ry="170" className={amber} />
        <ellipse cx="60" cy="830" rx="300" ry="150" className={amber} />
      </g>
    </svg>
  );
}
