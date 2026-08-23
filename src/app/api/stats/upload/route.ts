import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);

  const todayCount = db
    .prepare(
      `SELECT COUNT(DISTINCT board_id) as c FROM sightings WHERE rasid_id = ? AND status != 'deleted' AND captured_date = ?`
    )
    .get(session.id, today) as { c: number };

  const monthCount = db
    .prepare(
      `SELECT COUNT(DISTINCT board_id) as c FROM sightings WHERE rasid_id = ? AND status != 'deleted' AND captured_date LIKE ?`
    )
    .get(session.id, `${monthPrefix}%`) as { c: number };

  const todayBoards = db
    .prepare(
      `SELECT s.code, s.captured_time, s.status, b.name as board_name, b.type as board_type
       FROM sightings s JOIN boards b ON b.id = s.board_id
       WHERE s.rasid_id = ? AND s.status != 'deleted' AND s.captured_date = ?
       ORDER BY s.captured_time DESC`
    )
    .all(session.id, today);

  return NextResponse.json({ today: todayCount.c, month: monthCount.c, todayBoards });
}
