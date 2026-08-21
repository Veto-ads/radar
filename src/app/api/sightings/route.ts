import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { nextSightingCode } from "@/lib/code";
import { isBoardAllowedForUser } from "@/lib/boardAssignments";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rasidId = searchParams.get("rasid_id");
  const status = searchParams.get("status") || "active"; // active = pending+analyzed

  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (status === "deleted") {
    clauses.push("s.status = 'deleted'");
  } else if (status === "pending" || status === "analyzed") {
    clauses.push("s.status = @status");
    params.status = status;
  } else {
    clauses.push("s.status != 'deleted'");
  }

  if (q) {
    clauses.push("(s.code LIKE @q OR b.name LIKE @q OR u.full_name LIKE @q)");
    params.q = `%${q}%`;
  }
  if (from) {
    clauses.push("s.captured_date >= @from");
    params.from = from;
  }
  if (to) {
    clauses.push("s.captured_date <= @to");
    params.to = to;
  }
  if (rasidId) {
    clauses.push("s.rasid_id = @rasidId");
    params.rasidId = rasidId;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT s.*, b.name as board_name, b.type as board_type, b.city as board_city,
              u.full_name as rasid_name
       FROM sightings s
       JOIN boards b ON b.id = s.board_id
       JOIN users u ON u.id = s.rasid_id
       ${where}
       ORDER BY s.created_at DESC`
    )
    .all(params);

  return NextResponse.json({ sightings: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.permissions.upload) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const form = await request.formData();
  const boardId = form.get("board_id");
  const videoFile = form.get("video");
  const imageFile = form.get("image");

  if (typeof boardId !== "string" || !boardId) {
    return NextResponse.json({ error: "يرجى اختيار اللوحة" }, { status: 400 });
  }
  const hasVideo = videoFile instanceof File && videoFile.size > 0;
  const hasImage = imageFile instanceof File && imageFile.size > 0;
  if (!hasVideo && !hasImage) {
    return NextResponse.json({ error: "يرجى إرفاق مقطع فيديو أو صورة" }, { status: 400 });
  }
  if (hasVideo && (videoFile as File).size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "حجم الفيديو يتجاوز الحد الأقصى المسموح (200 ميجابايت)" }, { status: 400 });
  }
  if (hasImage && (imageFile as File).size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "حجم الصورة يتجاوز الحد الأقصى المسموح (20 ميجابايت)" }, { status: 400 });
  }

  const db = getDb();
  const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(boardId);
  if (!board) {
    return NextResponse.json({ error: "لوحة غير موجودة" }, { status: 404 });
  }
  if (!isBoardAllowedForUser(session.id, boardId)) {
    return NextResponse.json({ error: "هذه اللوحة غير مخصصة لك" }, { status: 403 });
  }

  let videoUrl: string | null = null;
  let videoSize: number | null = null;
  if (hasVideo) {
    const file = videoFile as File;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "videos");
    await mkdir(uploadsDir, { recursive: true });
    const ext = path.extname(file.name) || ".mp4";
    const fileName = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, fileName), buffer);
    videoUrl = `/uploads/videos/${fileName}`;
    videoSize = file.size;
  }

  let imageUrl: string | null = null;
  if (hasImage) {
    const file = imageFile as File;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "sighting-images");
    await mkdir(uploadsDir, { recursive: true });
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, fileName), buffer);
    imageUrl = `/uploads/sighting-images/${fileName}`;
  }

  const now = new Date();
  const capturedDate = now.toISOString().slice(0, 10);
  const capturedTime = now.toTimeString().slice(0, 5);
  const id = randomUUID();
  const code = nextSightingCode();

  db.prepare(
    `INSERT INTO sightings (id, code, board_id, rasid_id, video_url, image_url, video_size_bytes, captured_date, captured_time, status)
     VALUES (?,?,?,?,?,?,?,?,?, 'pending')`
  ).run(id, code, boardId, session.id, videoUrl, imageUrl, videoSize, capturedDate, capturedTime);

  return NextResponse.json({ id, code }, { status: 201 });
}
