import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(_request: Request, context: RouteContext<"/api/sightings/[id]/restore">) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const db = getDb();
  const hasAds = db.prepare("SELECT COUNT(*) as c FROM ads WHERE sighting_id = ?").get(id) as {
    c: number;
  };
  db.prepare(
    "UPDATE sightings SET status = ?, deleted_at = NULL WHERE id = ?"
  ).run(hasAds.c > 0 ? "analyzed" : "pending", id);
  return NextResponse.json({ ok: true });
}
