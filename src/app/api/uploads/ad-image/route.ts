import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { MAX_AD_IMAGE_BYTES, isSupportedAdImageType, saveAdImage } from "@/lib/adImages";

// Uploading is split from PATCH /api/ads/[id] so a bulk edit can send the file
// once and then point every selected ad at the same stored image.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "يرجى اختيار صورة" }, { status: 400 });
  }
  if (file.size > MAX_AD_IMAGE_BYTES) {
    return NextResponse.json({ error: "حجم الصورة يتجاوز الحد الأقصى المسموح (20 ميجابايت)" }, { status: 400 });
  }
  if (!isSupportedAdImageType(file.type)) {
    return NextResponse.json({ error: "صيغة الصورة غير مدعومة (JPG أو PNG أو WEBP أو GIF)" }, { status: 400 });
  }

  const url = await saveAdImage(file);
  return NextResponse.json({ url }, { status: 201 });
}
