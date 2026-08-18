import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request, context: RouteContext<"/api/users/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const db = getDb();

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (body.full_name !== undefined || body.role !== undefined || body.custom_role !== undefined || body.status !== undefined) {
    const current = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown>;
    db.prepare(
      `UPDATE users SET full_name=@full_name, role=@role, custom_role=@custom_role, status=@status WHERE id=@id`
    ).run({
      id,
      full_name: body.full_name ?? current.full_name,
      role: body.role ?? current.role,
      custom_role: body.custom_role ?? current.custom_role,
      status: body.status ?? current.status,
    });
  }

  if (body.password) {
    db.prepare("UPDATE users SET password_hash = ?, reset_requested_at = NULL WHERE id = ?").run(
      bcrypt.hashSync(body.password, 10),
      id
    );
  }

  if (
    body.can_upload !== undefined ||
    body.can_review !== undefined ||
    body.can_dashboard !== undefined ||
    body.can_admin !== undefined
  ) {
    const currentPerm = db.prepare("SELECT * FROM permissions WHERE user_id = ?").get(id) as
      | Record<string, number>
      | undefined;
    db.prepare(
      `INSERT INTO permissions (user_id, can_upload, can_review, can_dashboard, can_admin)
       VALUES (@id,@can_upload,@can_review,@can_dashboard,@can_admin)
       ON CONFLICT(user_id) DO UPDATE SET can_upload=@can_upload, can_review=@can_review, can_dashboard=@can_dashboard, can_admin=@can_admin`
    ).run({
      id,
      can_upload: body.can_upload ?? currentPerm?.can_upload ?? 0,
      can_review: body.can_review ?? currentPerm?.can_review ?? 0,
      can_dashboard: body.can_dashboard ?? currentPerm?.can_dashboard ?? 0,
      can_admin: body.can_admin ?? currentPerm?.can_admin ?? 0,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/users/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  if (id === session.id) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك الحالي" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
