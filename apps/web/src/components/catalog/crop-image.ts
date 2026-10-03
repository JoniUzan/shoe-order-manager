import { PRODUCT_IMAGE_QUALITY, PRODUCT_IMAGE_TYPE, squareCrop } from "@repo/domain";

/**
 * A picked photo as the Product image is stored: its centre square, at most
 * 1024px, as a JPEG. Done in the browser so a 12MP phone photo never leaves
 * the phone at full size. Throws when the browser can't decode the file
 * (HEIC outside Safari, a PDF renamed .jpg).
 */
export async function cropToSquareJpeg(file: Blob): Promise<Blob> {
  // `from-image` turns a phone photo the way its EXIF says it was held.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { sx, sy, side, out } = squareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d canvas");
    // A transparent PNG would turn black in a JPEG; white is what a product
    // shot on a cut-out background expects.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out, out);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("could not encode"))),
        PRODUCT_IMAGE_TYPE,
        PRODUCT_IMAGE_QUALITY,
      ),
    );
  } finally {
    bitmap.close();
  }
}
