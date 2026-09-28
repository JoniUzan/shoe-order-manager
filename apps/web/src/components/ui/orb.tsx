import { AVATARS, type AvatarCode } from "@repo/domain";
import Image from "next/image";

import { cn } from "@repo/ui/lib/utils";

/**
 * The orbs are the one place colour is allowed into a system that is otherwise
 * strictly monochrome — see the note at the top of `globals.css`. They carry no
 * meaning: an orb never encodes status, rank or payment state, so nothing is
 * lost by a viewer who cannot tell them apart. They exist so the product has a
 * face, and so the two screens with nothing in them are not empty rectangles.
 *
 * The art is a square with the sphere inscribed and the corners flattened, which
 * is why every orb is clipped with `rounded-full` rather than served as a
 * transparent PNG — film grain is the worst case for PNG, and the JPEG is 6 KB
 * against 600.
 */
// The first six, which generated avatars keep drawing from so nobody's orb
// changed when the rest were added for the picker (`AVATARS`).
const ORBS = ["abyss", "amber", "bronze", "crimson", "lunar", "ochre"] as const;

/** FNV-1a, so the same person always gets the same orb, on every device. */
function pickOrb(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ORBS[(h >>> 0) % ORBS.length]!;
}

/**
 * The avatar orb, as a URL rather than a component: it is handed to Radix's
 * `AvatarImage`, which keeps the initial underneath as a real fallback if the
 * image never loads.
 *
 * @param seed stable per identity — an id or email, never a display name.
 */
export function orbSrc(seed: string) {
  return `/orbs/${pickOrb(seed)}-sm.jpg`;
}

/**
 * A User's Avatar: the orb they picked (`image` holds `orb:<code>`), or, if
 * they never picked one, the one generated from their email.
 */
export function avatarOf(user: { image: string | null; email: string }): AvatarCode {
  const picked = user.image?.startsWith("orb:") ? user.image.slice(4) : null;
  return (AVATARS as readonly string[]).includes(picked ?? "")
    ? (picked as AvatarCode)
    : pickOrb(user.email);
}

/** An avatar orb's image: `sm` for avatars, `full` for the large picker. */
export function avatarSrc(code: AvatarCode, size: "sm" | "full" = "sm") {
  return size === "sm" ? `/orbs/${code}-sm.jpg` : `/orbs/${code}.jpg`;
}

/**
 * The ambient layer, for the two screens that would otherwise be blank.
 *
 * `panel` sits inside a clipping card: each orb is masked so it fades to nothing
 * *before* it reaches the card's edge. Without that the overhang ends in a hard
 * straight cut and reads as a broken image — the source site gets away with it
 * only because its spheres run off a 1440px page where the cut is never seen.
 *
 * `page` fills the viewport, where an orb may bleed off the edge honestly.
 */
export function OrbField({
  variant = "panel",
  className,
}: {
  variant?: "panel" | "page";
  className?: string;
}) {
  const common = "pointer-events-none absolute select-none";

  if (variant === "page") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
        <Image
          src="/orbs/crimson.jpg"
          alt=""
          width={520}
          height={520}
          priority={false}
          className={cn(common, "-top-44 -start-48 size-[520px] rounded-full opacity-55")}
        />
        <Image
          src="/orbs/abyss.jpg"
          alt=""
          width={300}
          height={300}
          className={cn(common, "-bottom-28 -end-20 size-[300px] rounded-full opacity-45")}
        />
        <Image
          src="/orbs/amber.jpg"
          alt=""
          width={128}
          height={128}
          className={cn(common, "top-[16%] end-[14%] hidden size-32 rounded-full opacity-70 sm:block")}
        />
      </div>
    );
  }

  // The mask clears at 62% of the radius, so every edge sits further out than
  // that: 150px radius → transparent past 93px → a 30/40px overhang is safe.
  const fade = {
    maskImage: "radial-gradient(circle at 50% 50%, #000 30%, transparent 62%)",
    WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 30%, transparent 62%)",
  } as const;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <Image
        src="/orbs/ochre.jpg"
        alt=""
        width={300}
        height={300}
        style={fade}
        className={cn(common, "-top-8 -end-10 size-[300px] rounded-full opacity-40")}
      />
      <Image
        src="/orbs/bronze.jpg"
        alt=""
        width={190}
        height={190}
        style={fade}
        className={cn(common, "-bottom-5 -start-6 size-[190px] rounded-full opacity-40")}
      />
    </div>
  );
}
