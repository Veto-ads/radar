import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request, context: RouteContext<"/api/sightings/[id]">) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const db = getDb();

  const sighting = db.prepare("SELECT * FROM sightings WHERE id = ?").get(id);
  if (!sighting) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (body.board_id) {
    db.prepare("UPDATE sightings SET board_id = ? WHERE id = ?").run(body.board_id, id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext<"/api/sightings/[id]">) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const db = getDb();
  db.prepare("UPDATE sightings SET status = 'deleted', deleted_at = datetime('now') WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
