// Image storage abstraction for approved scraped-product images.
//
// WHY: scraped product cards initially reference the supplier's hotlinked image
// URL. Hotlinks are fragile (they 404, get rotated, or block hotlinking), so on
// admin approval we want to re-host the image on the project's OWN storage and
// keep BOTH the hosted URL and the original source URL (for attribution).
//
// This module auto-detects a configured provider and degrades cleanly:
//   1. Vercel Blob   — when BLOB_READ_WRITE_TOKEN is set and `@vercel/blob` is
//                      installed (recommended for this project; it deploys on
//                      Vercel).
//   2. Cloudinary    — when CLOUDINARY_URL / CLOUDINARY_CLOUD_NAME is set.
//   3. AWS S3        — when AWS_S3_BUCKET (or S3_BUCKET) is set.
//   4. passthrough   — DEFAULT. No provider configured → keep the original
//                      (hotlinked) URL. Nothing is uploaded; the source URL is
//                      still recorded so admins can re-host later.
//
// IMPORTANT: no heavy dependency is added implicitly. Providers are loaded via
// dynamic import inside try/catch, so the build/runtime never breaks when the
// SDK isn't installed. If you want real re-hosting, see the recommendation
// surfaced by `storageProviderStatus()` (add @vercel/blob + BLOB_READ_WRITE_TOKEN).

export type StorageProvider = "vercel-blob" | "cloudinary" | "s3" | "passthrough";

export function detectStorageProvider(): StorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) return "cloudinary";
  if (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET) return "s3";
  return "passthrough";
}

export type StorageStatus = {
  provider: StorageProvider;
  configured: boolean;
  recommendation?: string;
};

export function storageProviderStatus(): StorageStatus {
  const provider = detectStorageProvider();
  if (provider === "passthrough") {
    return {
      provider,
      configured: false,
      recommendation:
        "No image storage provider configured. Approved products keep their original " +
        "(hotlinked) image URL. Recommended: enable Vercel Blob — `npm i @vercel/blob` " +
        "and add the BLOB_READ_WRITE_TOKEN env var (Vercel → Storage → Blob).",
    };
  }
  return { provider, configured: true };
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/* ------------------------------------------------------------------ */
/* General-purpose media upload / delete (used by the media library)   */
/* ------------------------------------------------------------------ */

export type StoredObject = {
  /** Hosted/serving URL (always renderable). */
  url: string;
  /** Provider object key for later delete/replace. Null in passthrough mode. */
  storageKey: string | null;
  provider: StorageProvider;
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

function extFor(contentType: string, fallbackName?: string): string {
  const byMime = EXT_BY_MIME[contentType.split(";")[0].trim().toLowerCase()];
  if (byMime) return byMime;
  const fromName = fallbackName?.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return "bin";
}

/**
 * Upload an in-memory buffer to the configured storage provider and return the
 * hosted URL + storage key. In passthrough mode (no provider configured) this
 * returns a `data:` URL so the asset is still renderable for previews/dev, with
 * a null storageKey to signal nothing was persisted remotely.
 *
 * Never throws — on any provider error it degrades to the passthrough result.
 */
export async function uploadBuffer(
  buffer: Buffer,
  opts: { contentType: string; prefix?: string; filename?: string }
): Promise<StoredObject> {
  const provider = detectStorageProvider();
  const contentType = opts.contentType || "application/octet-stream";
  const ext = extFor(contentType, opts.filename);
  const base = slug(opts.filename?.replace(/\.[^.]+$/, "") || "media") || "media";
  const key = `${opts.prefix ?? "media"}/${base}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  if (provider === "vercel-blob") {
    try {
      const spec = "@vercel/blob";
      const mod = (await import(/* webpackIgnore: true */ spec).catch(() => null)) as {
        put?: (
          k: string,
          b: Buffer,
          o: Record<string, unknown>
        ) => Promise<{ url: string }>;
      } | null;
      if (mod?.put) {
        const { url } = await mod.put(key, buffer, {
          access: "public",
          contentType,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        if (url) return { url, storageKey: key, provider };
      }
    } catch {
      // fall through to passthrough
    }
  }

  // Passthrough: embed as a data URL so previews still work without a provider.
  const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
  return { url: dataUrl, storageKey: null, provider: "passthrough" };
}

/**
 * Delete an object previously stored via `uploadBuffer`/`persistProductImage`.
 * No-op (resolves false) in passthrough mode or when the key is null. Never
 * throws.
 */
export async function deleteFromStorage(storageKey: string | null | undefined): Promise<boolean> {
  if (!storageKey) return false;
  const provider = detectStorageProvider();
  if (provider === "vercel-blob") {
    try {
      const spec = "@vercel/blob";
      const mod = (await import(/* webpackIgnore: true */ spec).catch(() => null)) as {
        del?: (k: string | string[], o?: Record<string, unknown>) => Promise<void>;
      } | null;
      if (mod?.del) {
        await mod.del(storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Re-host a remote image and return the hosted URL. Returns the ORIGINAL url
 * unchanged for the passthrough provider or on any failure (never throws), so
 * the approval flow always succeeds and the catalogue always has a usable URL.
 */
export async function persistProductImage(
  originalUrl: string,
  productId: string
): Promise<string> {
  if (!/^https?:\/\//i.test(originalUrl)) return originalUrl;
  const provider = detectStorageProvider();
  if (provider === "passthrough") return originalUrl;

  try {
    const res = await fetch(originalUrl, { redirect: "follow" });
    if (!res.ok) return originalUrl;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const key = `products/${slug(productId)}-${Date.now()}.${ext}`;

    if (provider === "vercel-blob") {
      // Non-literal specifier + webpackIgnore so the bundler/TS never require
      // the package at build time; it is only loaded at runtime when present.
      const spec = "@vercel/blob";
      const mod = (await import(/* webpackIgnore: true */ spec).catch(() => null)) as {
        put?: (
          k: string,
          b: Buffer,
          o: Record<string, unknown>
        ) => Promise<{ url: string }>;
      } | null;
      if (!mod?.put) return originalUrl;
      const { url } = await mod.put(key, buffer, {
        access: "public",
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return url || originalUrl;
    }

    // cloudinary / s3: SDKs not bundled — leave the implementation point clear
    // and fall back to passthrough so behaviour stays safe until wired up.
    return originalUrl;
  } catch {
    return originalUrl;
  }
}
