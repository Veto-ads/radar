import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createApiKey } from "@/lib/apiKeys";

export async function GET() {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const db = getDb();
  const keys = db
    .prepare(
      `SELECT id, label, key_prefix, created_at, last_used_at, revoked FROM api_keys ORDER BY created_at DESC`
    )
    .all();
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const body = await request.json();
  const label = String(body.label || "").trim();
  if (!label) return NextResponse.json({ error: "اسم المفتاح مطلوب" }, { status: 400 });

  const { id, plaintext } = createApiKey(label, session.id);
  return NextResponse.json({ id, key: plaintext }, { status: 201 });
}
