import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const db = getDb();
  const rows = db
    .prepare("SELECT key, value FROM settings WHERE key IN ('gemini_prompt', 'gemini_image_prompt')")
    .all() as { key: string; value: string }[];
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({
    video_prompt: byKey.gemini_prompt || "",
    image_prompt: byKey.gemini_image_prompt || "",
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const body = await request.json();
  const videoPrompt = typeof body.video_prompt === "string" ? body.video_prompt.trim() : undefined;
  const imagePrompt = typeof body.image_prompt === "string" ? body.image_prompt.trim() : undefined;

  if (videoPrompt !== undefined && !videoPrompt) {
    return NextResponse.json({ error: "تعليمات تحليل الفيديو لا يمكن أن تكون فارغة" }, { status: 400 });
  }
  if (imagePrompt !== undefined && !imagePrompt) {
    return NextResponse.json({ error: "تعليمات تحليل الصورة لا يمكن أن تكون فارغة" }, { status: 400 });
  }

  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  if (videoPrompt !== undefined) upsert.run("gemini_prompt", videoPrompt);
  if (imagePrompt !== undefined) upsert.run("gemini_image_prompt", imagePrompt);

  return NextResponse.json({ ok: true });
}
