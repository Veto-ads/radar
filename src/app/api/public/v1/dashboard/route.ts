import { corsJson, corsPreflight, requireApiKey } from "@/lib/publicApi";
import { getDashboardStats } from "@/lib/queries/dashboard";

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
  const category = searchParams.get("category") || "all";

  return corsJson(getDashboardStats(from, to, category));
}
