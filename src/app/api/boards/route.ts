import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAssignedBoardIds } from "@/lib/boardAssignments";
import type { Board } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const db = getDb();

  let rows: Board[];
  if (q) {
    rows = db
      .prepare(`SELECT * FROM boards WHERE name LIKE ? ORDER BY name`)
      .all(`%${q}%`) as Board[];
  } else {
    rows = db.prepare(`SELECT * FROM boards ORDER BY name`).all() as Board[];
  }

  const assigned = getAssignedBoardIds(session.id);
  if (assigned) {
    const allowed = new Set(assigned);
    rows = rows.filter((b) => allowed.has(b.id));
  }

  return NextResponse.json({
    boards: rows.map((b) => ({ ...b, streets: JSON.parse(b.streets || "[]") })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await request.json();
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO boards (id, name, type, category, city, district, streets, faces, screens, price, price_duration_days, location_url, image_url, company)
     VALUES (@id,@name,@type,@category,@city,@district,@streets,@faces,@screens,@price,@price_duration_days,@location_url,@image_url,@company)`
  ).run({
    id,
    name: body.name,
    type: body.type,
    category: body.category || "خارجي",
    city: body.city || null,
    district: body.district || null,
    streets: JSON.stringify(body.streets || []),
    faces: body.faces || 1,
    screens: body.screens || 0,
    price: body.price || 0,
    price_duration_days: body.price_duration_days || 14,
    location_url: body.location_url || null,
    image_url: body.image_url || null,
    company: body.company || null,
  });

  return NextResponse.json({ id }, { status: 201 });
}
