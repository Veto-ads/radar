import { corsJson, corsPreflight, requireApiKey, getPublicOrigin } from "@/lib/publicApi";
import { findUnitCluster, clusterUnitTypes, assignUnitIds } from "@/lib/unitMatching";
import { getAllBoardTypesWithCounts, getUnitStats, getUnitCities, getDistinctCitiesForTypes } from "@/lib/queries/unit";
import { resolveCityAgainstList } from "@/lib/cityMatching";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  if (!requireApiKey(request)) {
    return corsJson({ error: "مفتاح API غير صالح" }, 401);
  }

  const origin = getPublicOrigin(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() || null;
  const name = searchParams.get("name")?.trim() || null;
  const nameEn = searchParams.get("name_en")?.trim() || null;
  const cityQuery = searchParams.get("city")?.trim() || null;
  const from = searchParams.get("from") || "2000-01-01";
  const to = searchParams.get("to") || "2999-12-31";

  if (!id && !name) return corsJson({ error: "المعرّف (id) أو الاسم مطلوب" }, 400);

  const rawTypes = getAllBoardTypesWithCounts();
  const clusters = clusterUnitTypes(rawTypes);

  let cluster;
  let unitId: string;
  if (id) {
    const idMap = assignUnitIds(clusters);
    cluster = clusters.find((c) => idMap.get(c) === id.toLowerCase()) || null;
    unitId = id.toLowerCase();
  } else {
    cluster = findUnitCluster(rawTypes, name!, nameEn);
    unitId = cluster ? (assignUnitIds(clusters).get(cluster) as string) : "";
  }
  if (!cluster) return corsJson({ found: false }, 404);

  let cityFilter: string | null = null;
  if (cityQuery) {
    const actualCities = getDistinctCitiesForTypes(cluster.rawTypes);
    cityFilter = resolveCityAgainstList(cityQuery, actualCities);
    if (!cityFilter) return corsJson({ found: false }, 404);
  }

  const stats = getUnitStats(cluster.rawTypes, from, to, cityFilter);
  for (const ad of stats.lastMonthAds) {
    if (ad.image_url) ad.image_url = `${origin}${ad.image_url}`;
  }
  const cities = getUnitCities(cluster.rawTypes, from, to);

  return corsJson({
    found: true,
    unit_id: unitId,
    name_ar: cluster.nameAr,
    name_en: cluster.nameEn,
    aliases: cluster.rawTypes,
    cities,
    ...stats,
  });
}
