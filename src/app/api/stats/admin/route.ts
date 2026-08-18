import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const db = getDb();
  const rasids = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'rasid'").get() as { c: number }).c;
  const quality = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'quality'").get() as { c: number }).c;
  const sightings = (db.prepare("SELECT COUNT(*) as c FROM sightings WHERE status != 'deleted'").get() as {
    c: number;
  }).c;
  const boards = (db.prepare("SELECT COUNT(*) as c FROM boards").get() as { c: number }).c;

  return NextResponse.json({ rasids, quality, sightings, boards });
}
