import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { findUserByUsername } from "@/lib/auth";

const bodySchema = z.object({ username: z.string().min(1) });

const GENERIC_MESSAGE = "إذا كان اسم المستخدم صحيحاً، تم إرسال طلب إعادة تعيين كلمة المرور إلى مدير النظام";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const user = findUserByUsername(parsed.data.username);
  if (user) {
    const db = getDb();
    db.prepare("UPDATE users SET reset_requested_at = datetime('now') WHERE id = ?").run(user.id);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
