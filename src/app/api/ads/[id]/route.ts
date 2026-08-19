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

  const existing = db.prepare("SELECT * FROM ads WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  db.prepare(
    `UPDATE ads SET company_name=@company_name, sector=@sector, duration_seconds=@duration_seconds,
     repeats_per_minute=@repeats_per_minute, repeats_per_day=@repeats_per_day, objective=@objective
     WHERE id=@id`
  ).run({
    id,
    company_name: body.company_name ?? existing.company_name,
    sector: body.sector ?? existing.sector,
    duration_seconds:
      body.duration_seconds !== undefined ? Number(body.duration_seconds) || 0 : existing.duration_seconds,
    repeats_per_minute:
      body.repeats_per_minute !== undefined ? Number(body.repeats_per_minute) || 0 : existing.repeats_per_minute,
    repeats_per_day:
      body.repeats_per_day !== undefined ? Number(body.repeats_per_day) || 0 : existing.repeats_per_day,
    objective: body.objective !== undefined ? body.objective || null : existing.objective,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/ads/[id]">) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const db = getDb();

  const existing = db.prepare("SELECT id FROM ads WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  db.prepare("DELETE FROM ads WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
