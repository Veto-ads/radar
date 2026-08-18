import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request, context: RouteContext<"/api/ads/[id]">) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare("SELECT id FROM ads WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  db.prepare(
    `UPDATE ads SET company_name=@company_name, sector=@sector, duration_seconds=@duration_seconds,
     repeats_per_minute=@repeats_per_minute, repeats_per_day=@repeats_per_day, objective=@objective
     WHERE id=@id`
  ).run({
    id,
    company_name: body.company_name,
    sector: body.sector,
    duration_seconds: Number(body.duration_seconds) || 0,
    repeats_per_minute: Number(body.repeats_per_minute) || 0,
    repeats_per_day: Number(body.repeats_per_day) || 0,
    objective: body.objective || null,
  });

  return NextResponse.json({ ok: true });
}
