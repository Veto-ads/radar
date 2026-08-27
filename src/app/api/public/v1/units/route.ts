import { corsJson, corsPreflight, requireApiKey } from "@/lib/publicApi";
import { clusterUnitTypes, assignUnitIds } from "@/lib/unitMatching";
import { getAllBoardTypesWithCounts, getUnitAdCountsByType, getUnitCities } from "@/lib/queries/unit";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  if (!requireApiKey(request)) {
    return corsJson({ error: "مفتاح API غير صالح" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "2000-01-01";
  const to = searchParams.get("to") || "2999-12-31";

  const rawTypes = getAllBoardTypesWithCounts();
  const clusters = clusterUnitTypes(rawTypes);
  const idMap = assignUnitIds(clusters);
  const adCountsByType = new Map(getUnitAdCountsByType(from, to).map((r) => [r.type, r.count]));

  const units = clusters
    .map((cluster) => {
      const ads_count = cluster.rawTypes.reduce((sum, t) => sum + (adCountsByType.get(t) || 0), 0);
      return {
        unit_id: idMap.get(cluster),
        name_ar: cluster.nameAr,
        name_en: cluster.nameEn,
        aliases: cluster.rawTypes,
        has_stats: ads_count > 0,
        ads_count,
        cities: getUnitCities(cluster.rawTypes, from, to),
      };
    })
    .sort((a, b) => b.ads_count - a.ads_count);

  return corsJson({ units });
}
