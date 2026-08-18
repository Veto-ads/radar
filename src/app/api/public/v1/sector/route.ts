import { corsJson, corsPreflight, requireApiKey } from "@/lib/publicApi";
import { getSectorStats } from "@/lib/queries/sector";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  if (!requireApiKey(request)) {
    return corsJson({ error: "مفتاح API غير صالح" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const from = searchParams.get("from") || "2000-01-01";
  const to = searchParams.get("to") || "2999-12-31";
  if (!name) return corsJson({ error: "اسم القطاع مطلوب" }, 400);

  return corsJson(getSectorStats(name, from, to));
}
