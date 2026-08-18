import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request, context: RouteContext<"/api/board-types/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const db = getDb();

  const type = db.prepare("SELECT name FROM board_types WHERE id = ?").get(id) as
    | { name: string }
    | undefined;
  if (!type) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const newName = String(body.name || "").trim();
  if (!newName) return NextResponse.json({ error: "اسم النوع مطلوب" }, { status: 400 });

  const tx = db.transaction(() => {
    db.prepare("UPDATE board_types SET name = ? WHERE id = ?").run(newName, id);
    db.prepare("UPDATE boards SET type = ? WHERE type = ?").run(newName, type.name);
  });
  tx();

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/board-types/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const db = getDb();
  db.prepare("DELETE FROM board_types WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
