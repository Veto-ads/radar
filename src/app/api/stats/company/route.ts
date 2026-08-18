import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCompanyStats } from "@/lib/queries/company";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.permissions.dashboard) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const from = searchParams.get("from") || "2000-01-01";
  const to = searchParams.get("to") || "2999-12-31";
  if (!name) return NextResponse.json({ error: "اسم الشركة مطلوب" }, { status: 400 });

  return NextResponse.json(getCompanyStats(name, from, to));
}
