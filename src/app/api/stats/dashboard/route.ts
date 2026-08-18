import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/queries/dashboard";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.permissions.dashboard) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "2000-01-01";
  const to = searchParams.get("to") || "2999-12-31";
  const category = searchParams.get("category") || "all";

  return NextResponse.json(getDashboardStats(from, to, category));
}
