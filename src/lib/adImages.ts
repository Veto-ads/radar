import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";

export const MAX_AD_IMAGE_BYTES = 20 * 1024 * 1024;

// The stored extension comes from the browser-reported MIME type, never from the
// uploaded file name — that keeps path separators and executable extensions out
// of the public uploads directory. SVG is deliberately absent: it is served from
// the same origin as the app and would be a script-injection vector.
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function isSupportedAdImageType(type: string): boolean {
  return type in EXTENSION_BY_TYPE;
}

export async function saveAdImage(file: File): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "ad-images");
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}${EXTENSION_BY_TYPE[file.type]}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/ad-images/${fileName}`;
}

// Only images that belong to a single ad may leave the disk. A sighting's own
// upload (/uploads/sighting-images/...) is reused by every ad detected in it and
// by the sighting itself, so it is never removed here.
const AD_OWNED_PREFIXES = ["/uploads/frames/", "/uploads/ad-images/"];

export async function deleteAdImageIfUnused(db: Database.Database, url: string | null | undefined) {
  if (!url || !AD_OWNED_PREFIXES.some((prefix) => url.startsWith(prefix))) return;
  const stillUsed = db.prepare("SELECT 1 FROM ads WHERE frame_image_url = ? LIMIT 1").get(url);
  if (stillUsed) return;
  try {
    await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  } catch {
    // The row is what matters; a file that is already gone is not an error.
  }
}
