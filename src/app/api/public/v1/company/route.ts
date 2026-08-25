import { corsJson, corsPreflight, requireApiKey, getPublicOrigin } from "@/lib/publicApi";
import { getCompanyStats } from "@/lib/queries/company";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  if (!requireApiKey(request)) {
    return corsJson({ error: "مفتاح API غير صالح" }, 401);
  }

  const origin = getPublicOrigin(request);
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const from = searchParams.get("from") || "2000-01-01";
  const to = searchParams.get("to") || "2999-12-31";
  if (!name) return corsJson({ error: "اسم الشركة مطلوب" }, 400);

  const stats = getCompanyStats(name, from, to);
  for (const ads of Object.values(stats.monthlyArchive)) {
    for (const ad of ads as { frame_image_url: string | null }[]) {
      if (ad.frame_image_url) ad.frame_image_url = `${origin}${ad.frame_image_url}`;
    }
  }

  return corsJson(stats);
}
