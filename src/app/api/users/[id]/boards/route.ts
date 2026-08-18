import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, context: RouteContext<"/api/users/[id]/boards">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const db = getDb();
  const rows = db.prepare("SELECT board_id FROM board_assignments WHERE user_id = ?").all(id) as {
    board_id: string;
  }[];
  return NextResponse.json({ boardIds: rows.map((r) => r.board_id) });
}

export async function PUT(request: Request, context: RouteContext<"/api/users/[id]/boards">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const boardIds: string[] = Array.isArray(body.boardIds) ? body.boardIds : [];

  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM board_assignments WHERE user_id = ?").run(id);
    const insert = db.prepare("INSERT INTO board_assignments (board_id, user_id) VALUES (?, ?)");
    for (const boardId of boardIds) insert.run(boardId, id);
  });
  tx();

  return NextResponse.json({ ok: true });
}
