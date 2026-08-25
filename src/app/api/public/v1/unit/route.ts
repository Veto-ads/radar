import { corsJson, corsPreflight, requireApiKey, getPublicOrigin } from "@/lib/publicApi";
import { findUnitCluster } from "@/lib/unitMatching";
import { getAllBoardTypesWithCounts, getUnitStats } from "@/lib/queries/unit";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  if (!requireApiKey(request)) {
    return corsJson({ error: "مفتاح API غير صالح" }, 401);
  }

  const origin = getPublicOrigin(request);
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const nameEn = searchParams.get("name_en")?.trim() || null;
  const from = searchParams.get("from") || "2000-01-01";
  const to = searchParams.get("to") || "2999-12-31";

  if (!name) return corsJson({ error: "الاسم مطلوب" }, 400);

  const rawTypes = getAllBoardTypesWithCounts();
  const cluster = findUnitCluster(rawTypes, name, nameEn);
  if (!cluster) return corsJson({ found: false }, 404);

  const stats = getUnitStats(cluster.rawTypes, from, to);
  for (const ad of stats.lastMonthAds) {
    if (ad.image_url) ad.image_url = `${origin}${ad.image_url}`;
  }

  return corsJson({
    found: true,
    name_ar: cluster.nameAr,
    name_en: cluster.nameEn,
    ...stats,
  });
}
