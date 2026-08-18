import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserByUsername, getPermissions, toSessionUser, createSession } from "@/lib/auth";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const user = findUserByUsername(parsed.data.username);
  if (!user) {
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }
  if (user.status === "frozen") {
    return NextResponse.json({ error: "تم تجميد هذا الحساب، تواصل مع الإدارة" }, { status: 403 });
  }

  const ok = bcrypt.compareSync(parsed.data.password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const perm = getPermissions(user.id);
  const sessionUser = toSessionUser(user, perm);
  await createSession(sessionUser);

  return NextResponse.json({ user: sessionUser });
}
