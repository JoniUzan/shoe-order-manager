import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Object storage for Product images, through the S3 API only (ADR 0008):
 * Cloudflare R2 in production, a local S3 server in development and tests.
 *
 * Server-only. Configured by `S3_*` env vars; without `S3_BUCKET` storage is
 * off, uploads are refused and no image is shown, so the app still runs
 * without it.
 */

interface StorageConfig {
  bucket: string;
  client: S3Client;
}

let cached: StorageConfig | null | undefined;

function storage(): StorageConfig | null {
  if (cached !== undefined) return cached;
  const bucket = process.env.S3_BUCKET;
  cached = bucket
    ? {
        bucket,
        client: new S3Client({
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION ?? "auto",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
          },
          // R2 and local servers both take bucket-in-path URLs, which need no
          // per-bucket DNS.
          forcePathStyle: true,
        }),
      }
    : null;
  return cached;
}

export function storageConfigured(): boolean {
  return storage() !== null;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const s = storage();
  if (!s) throw new Error("storage is not configured");
  await s.client.send(
    new PutObjectCommand({
      Bucket: s.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // A key is never written twice (each upload gets a new name), so the
      // CDN and browsers may keep it forever.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/** The object's bytes, or null when it isn't there (or storage is off). */
export async function getObject(key: string): Promise<Uint8Array | null> {
  const s = storage();
  if (!s) return null;
  try {
    const res = await s.client.send(
      new GetObjectCommand({ Bucket: s.bucket, Key: key }),
    );
    return res.Body ? await res.Body.transformToByteArray() : null;
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

/**
 * Removes an object that nothing points at any more. Called after the write
 * that dropped the reference has committed, so a failure here only leaves an
 * unused file behind: it is logged, not thrown.
 */
export async function deleteObjectQuietly(key: string): Promise<void> {
  const s = storage();
  if (!s) return;
  try {
    await s.client.send(new DeleteObjectCommand({ Bucket: s.bucket, Key: key }));
  } catch (error) {
    console.error(`storage: could not delete ${key}`, error);
  }
}

/**
 * A stored key's public URL. The database holds only the key; the base
 * (`IMAGE_BASE_URL`, e.g. the bucket's r2.dev or CDN address) comes from env.
 */
export function imageUrl(key: string | null | undefined): string | null {
  const base = process.env.IMAGE_BASE_URL;
  if (!key || !base) return null;
  return `${base.replace(/\/+$/, "")}/${key}`;
}
