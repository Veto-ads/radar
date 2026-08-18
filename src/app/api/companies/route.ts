import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT a.company_name as name FROM ads a JOIN sightings s ON s.id=a.sighting_id WHERE s.status='analyzed' ORDER BY name`
    )
    .all();
  return NextResponse.json({ companies: rows });
}
