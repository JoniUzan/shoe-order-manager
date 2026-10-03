/**
 * The Product image: one square photo per Shoe model.
 *
 * The browser crops the picked photo to its centre square and scales it to
 * `PRODUCT_IMAGE_SIZE` as a JPEG before it uploads anything, so the server
 * only ever stores small, square JPEGs. JPEG rather than WebP because the
 * PDFs embed the same file, and react-pdf reads only JPEG and PNG.
 *
 * The database stores the image's storage key, never its URL (ADR 0008).
 */

/** The side of the stored square, in pixels. */
export const PRODUCT_IMAGE_SIZE = 1024;

/** The JPEG quality the browser encodes at (0–1). */
export const PRODUCT_IMAGE_QUALITY = 0.85;

/**
 * The most the server accepts. A 1024px JPEG at that quality is a few hundred
 * KB, so this only stops something that skipped the browser's resize.
 */
export const PRODUCT_IMAGE_MAX_BYTES = 1_500_000;

export const PRODUCT_IMAGE_TYPE = "image/jpeg";

const KEY = /^products\/(c[a-z0-9]+)\/[a-z0-9-]{16,64}\.jpg$/;

/**
 * Where a User's image lives in the bucket: under their id, with a random
 * name nobody can guess, so the public URL doesn't need to be secret.
 */
export function productImageKey(ownerId: string, name: string): string {
  return `products/${ownerId}/${name}.jpg`;
}

/** Whether `key` has the shape of a Product image key. */
export function isProductImageKey(key: string): boolean {
  return KEY.test(key);
}

/**
 * Whether `key` is one of `ownerId`'s images. A Server Action checks this
 * before saving a key the browser sent, so a User can't point their model at
 * another User's image.
 */
export function isOwnProductImageKey(ownerId: string, key: string): boolean {
  return KEY.exec(key)?.[1] === ownerId;
}

/** Whether the bytes start like a JPEG file (SOI marker, then a segment). */
export function looksLikeJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * The centre square of a `width` × `height` photo, and the side it is scaled
 * to: never up, so a small photo stays as sharp as it was.
 */
export function squareCrop(
  width: number,
  height: number,
  max = PRODUCT_IMAGE_SIZE,
): { sx: number; sy: number; side: number; out: number } {
  const side = Math.min(width, height);
  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    side,
    out: Math.min(side, max),
  };
}
