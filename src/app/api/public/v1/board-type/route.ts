import { corsJson, corsPreflight, requireApiKey } from "@/lib/publicApi";
import { getBoardTypeStats } from "@/lib/queries/boardType";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  if (!requireApiKey(request)) {
    return corsJson({ error: "مفتاح API غير صالح" }, 401);
  }

  const { searchParams, origin } = new URL(request.url);
  const type = searchParams.get("type");
  const sector = searchParams.get("sector")?.trim() || null;
  if (!type) return corsJson({ error: "نوع اللوحة مطلوب" }, 400);

  const stats = getBoardTypeStats(type, sector);
  for (const ad of stats.lastMonthAds as { frame_image_url: string | null }[]) {
    if (ad.frame_image_url) ad.frame_image_url = `${origin}${ad.frame_image_url}`;
  }

  return corsJson(stats);
}
