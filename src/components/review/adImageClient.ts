"use client";

import { useEffect, useRef, useState } from "react";

export const MAX_AD_IMAGE_BYTES = 20 * 1024 * 1024;
export const AD_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const SUPPORTED_TYPES = AD_IMAGE_ACCEPT.split(",");

// Mirrors the checks in /api/uploads/ad-image so a bad file is rejected before
// the reviewer waits on an upload of it.
export function validateAdImage(file: File): string | null {
  if (!SUPPORTED_TYPES.includes(file.type)) return "صيغة الصورة غير مدعومة (JPG أو PNG أو WEBP أو GIF)";
  if (file.size > MAX_AD_IMAGE_BYTES) return "حجم الصورة يتجاوز الحد الأقصى المسموح (20 ميجابايت)";
  return null;
}

export async function uploadAdImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/uploads/ad-image", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "تعذر رفع الصورة");
  return data.url as string;
}

// The stored file name is a UUID, so hand the reviewer something they can find
// again on their disk: the sighting code and the company it was filed under.
export function adImageFileName(url: string, label: string): string {
  const extension = url.slice(url.lastIndexOf(".")).toLowerCase();
  const safeLabel = label.replace(/[\\/:*?"<>|]/g, "-").trim() || "إعلان";
  return `${safeLabel}${/^\.[a-z0-9]+$/.test(extension) ? extension : ".jpg"}`;
}

// A picked-but-not-yet-uploaded image is shown through an object URL, which has to
// be revoked when another file replaces it or the modal closes.
export function useAdImagePreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  function preview(file: File | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(urlRef.current);
  }

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  return [previewUrl, preview] as const;
}
