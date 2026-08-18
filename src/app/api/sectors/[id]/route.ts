import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request, context: RouteContext<"/api/sectors/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const db = getDb();

  const sector = db.prepare("SELECT name FROM sectors WHERE id = ?").get(id) as
    | { name: string }
    | undefined;
  if (!sector) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const newName = String(body.name || "").trim();
  if (!newName) return NextResponse.json({ error: "اسم القطاع مطلوب" }, { status: 400 });

  const tx = db.transaction(() => {
    db.prepare("UPDATE sectors SET name = ? WHERE id = ?").run(newName, id);
    db.prepare("UPDATE ads SET sector = ? WHERE sector = ?").run(newName, sector.name);
  });
  tx();

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/sectors/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const db = getDb();
  db.prepare("DELETE FROM sectors WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
