import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const db = getDb();
  const categories = db.prepare("SELECT * FROM board_categories ORDER BY name").all();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "اسم التصنيف مطلوب" }, { status: 400 });
  }
  const db = getDb();
  const id = randomUUID();
  try {
    db.prepare("INSERT INTO board_categories (id, name) VALUES (?, ?)").run(id, body.name.trim());
  } catch {
    return NextResponse.json({ error: "التصنيف موجود بالفعل" }, { status: 409 });
  }
  return NextResponse.json({ id }, { status: 201 });
}
