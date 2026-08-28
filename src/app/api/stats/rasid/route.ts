import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);

  const rasids = db.prepare("SELECT id, full_name FROM users WHERE role = 'rasid'").all() as {
    id: string;
    full_name: string;
  }[];

  const countStmt = db.prepare(
    "SELECT COUNT(*) as c FROM sightings WHERE rasid_id = ? AND status != 'deleted' AND captured_date LIKE ?"
  );
  const rangeStmt = db.prepare(
    "SELECT COUNT(*) as c FROM sightings WHERE rasid_id = ? AND status != 'deleted' AND captured_date BETWEEN ? AND ?"
  );

  const hasRange = !!(from && to);
  const stats = rasids.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    today: (countStmt.get(r.id, `${today}%`) as { c: number }).c,
    month: (countStmt.get(r.id, `${monthPrefix}%`) as { c: number }).c,
    year: (countStmt.get(r.id, `${yearPrefix}%`) as { c: number }).c,
    custom: hasRange ? (rangeStmt.get(r.id, from, to) as { c: number }).c : null,
  }));

  return NextResponse.json({ stats });
}
