import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const db = getDb();

  const rows = role
    ? db.prepare("SELECT u.*, p.can_upload, p.can_review, p.can_dashboard, p.can_admin FROM users u LEFT JOIN permissions p ON p.user_id = u.id WHERE u.role = ? ORDER BY u.full_name").all(role)
    : db.prepare("SELECT u.*, p.can_upload, p.can_review, p.can_dashboard, p.can_admin FROM users u LEFT JOIN permissions p ON p.user_id = u.id ORDER BY u.full_name").all();

  return NextResponse.json({
    users: (rows as Record<string, unknown>[]).map(({ password_hash, ...rest }) => rest),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await request.json();
  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(body.username);
  if (existing) {
    return NextResponse.json({ error: "اسم المستخدم مستخدم بالفعل" }, { status: 409 });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, password_hash, full_name, role, custom_role, status) VALUES (?,?,?,?,?,?, 'active')`
  ).run(
    id,
    body.username,
    bcrypt.hashSync(body.password, 10),
    body.full_name,
    body.role,
    body.custom_role || null
  );

  db.prepare(
    `INSERT INTO permissions (user_id, can_upload, can_review, can_dashboard, can_admin) VALUES (?,?,?,?,?)`
  ).run(id, body.can_upload ? 1 : 0, body.can_review ? 1 : 0, body.can_dashboard ? 1 : 0, body.can_admin ? 1 : 0);

  return NextResponse.json({ id }, { status: 201 });
}
