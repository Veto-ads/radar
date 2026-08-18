import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBoardTypeStats } from "@/lib/queries/boardType";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.permissions.dashboard) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const sector = searchParams.get("sector")?.trim() || null;
  if (!type) return NextResponse.json({ error: "نوع اللوحة مطلوب" }, { status: 400 });

  return NextResponse.json(getBoardTypeStats(type, sector));
}
