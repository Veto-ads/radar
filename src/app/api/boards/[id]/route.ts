import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request, context: RouteContext<"/api/boards/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare("SELECT * FROM boards WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  db.prepare(
    `UPDATE boards SET name=@name, type=@type, category=@category, city=@city, district=@district,
     streets=@streets, faces=@faces, screens=@screens, price=@price, price_duration_days=@price_duration_days,
     location_url=@location_url, image_url=@image_url, company=@company WHERE id=@id`
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

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/boards/[id]">) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await context.params;
  const db = getDb();
  db.prepare("DELETE FROM boards WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
